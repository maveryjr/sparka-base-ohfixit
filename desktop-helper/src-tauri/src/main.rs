#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::collections::HashMap;
use std::process::Command;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use axum::{routing::{get, post}, Json, Router, extract::State, http::HeaderMap};
use tower_http::cors::{Any, CorsLayer};
use std::net::SocketAddr;
use serde::{Deserialize, Serialize};
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use chrono::Utc;
use reqwest::Client;
use base64::{Engine as _, engine::general_purpose};
use sysinfo::{System, Disks};

// JWT Claims structure for OhFixIt tokens
#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    chat_id: Option<String>,
    user_id: Option<String>,
    anonymous_id: Option<String>,
    action_id: String,
    approval_id: String,
    scope: String,
    exp: usize,
    iat: usize,
}

// Action execution result
#[derive(Debug, Serialize, Deserialize)]
struct ActionResult {
    success: bool,
    message: String,
    error: Option<String>,
    artifacts: Option<Vec<ActionArtifact>>,
    rollback_id: Option<String>,
}

// Action artifact structure
#[derive(Debug, Serialize, Deserialize, Clone)]
struct ActionArtifact {
    artifact_type: String,
    uri: Option<String>,
    hash: Option<String>,
    data: Option<String>,
}

// Rollback point structure
#[derive(Debug, Serialize, Deserialize, Clone)]
struct RollbackPoint {
    method: String,
    data: serde_json::Value,
}

// Allowlisted action definitions
#[derive(Debug, Clone)]
struct ActionDefinition {
    id: String,
    title: String,
    os: String,
    commands: Vec<String>,
    rollback_commands: Vec<String>,
    reversible: bool,
    estimated_time: String,
    requirements: Vec<String>,
    creates_backup: bool,
}

impl ActionDefinition {
    fn new(id: &str, title: &str, os: &str, commands: Vec<&str>) -> Self {
        Self {
            id: id.to_string(),
            title: title.to_string(),
            os: os.to_string(),
            commands: commands.iter().map(|s| s.to_string()).collect(),
            rollback_commands: vec![],
            reversible: true,
            estimated_time: "10 seconds".to_string(),
            requirements: vec!["Administrator privileges".to_string()],
            creates_backup: false,
        }
    }

    fn with_rollback(mut self, rollback_commands: Vec<&str>) -> Self {
        self.rollback_commands = rollback_commands.iter().map(|s| s.to_string()).collect();
        self.creates_backup = true;
        self
    }
}

// Global state for tracking executions
struct AppState {
    actions: HashMap<String, ActionDefinition>,
    client: Client,
    jwt_secret: String,
}

impl AppState {
    fn new() -> Self {
        let mut actions = HashMap::new();

        // Initialize allowlisted actions for macOS with rollback support
        actions.insert(
            "flush-dns-macos".to_string(),
            ActionDefinition::new(
                "flush-dns-macos",
                "Flush DNS Cache (macOS)",
                "macos",
                vec![
                    "sudo dscacheutil -flushcache",
                    "sudo killall -HUP mDNSResponder"
                ]
            )
        );

        actions.insert(
            "toggle-wifi-macos".to_string(),
            ActionDefinition::new(
                "toggle-wifi-macos",
                "Toggle Wi‑Fi (macOS)",
                "macos",
                vec![
                    "networksetup -getairportpower en0 > /tmp/wifi_state_backup.txt",
                    "networksetup -setairportpower en0 off",
                    "sleep 2",
                    "networksetup -setairportpower en0 on"
                ]
            ).with_rollback(vec![
                "if grep -q 'On' /tmp/wifi_state_backup.txt; then networksetup -setairportpower en0 on; else networksetup -setairportpower en0 off; fi",
                "rm -f /tmp/wifi_state_backup.txt"
            ])
        );

        actions.insert(
            "clear-app-cache".to_string(),
            ActionDefinition::new(
                "clear-app-cache",
                "Clear App Cache (macOS)",
                "macos",
                vec![
                    "mkdir -p /tmp/cache_backup_$(date +%s)",
                    "find ~/Library/Caches -name \"*.cache\" -type f -exec cp {} /tmp/cache_backup_$(date +%s)/ \\; 2>/dev/null || true",
                    "find ~/Library/Caches -name \"*.cache\" -type f -delete 2>/dev/null || true"
                ]
            ).with_rollback(vec![
                "latest_backup=$(ls -t /tmp/cache_backup_* | head -1)",
                "if [ -d \"$latest_backup\" ]; then cp \"$latest_backup\"/* ~/Library/Caches/ 2>/dev/null || true; fi"
            ])
        );

        // Additional safe macOS actions
        actions.insert(
            "restart-finder".to_string(),
            ActionDefinition::new(
                "restart-finder",
                "Restart Finder (macOS)",
                "macos",
                vec![
                    "killall Finder"
                ]
            )
        );

        actions.insert(
            "clear-recent-items".to_string(),
            ActionDefinition::new(
                "clear-recent-items",
                "Clear Recent Items (macOS)",
                "macos",
                vec![
                    "defaults delete com.apple.recentitems RecentApplications 2>/dev/null || true",
                    "defaults delete com.apple.recentitems RecentDocuments 2>/dev/null || true",
                    "defaults delete com.apple.recentitems RecentServers 2>/dev/null || true"
                ]
            )
        );

        actions.insert(
            "reset-launchpad".to_string(),
            ActionDefinition::new(
                "reset-launchpad",
                "Reset Launchpad Layout (macOS)",
                "macos",
                vec![
                    "defaults write com.apple.dock ResetLaunchPad -bool true",
                    "killall Dock"
                ]
            )
        );

        actions.insert(
            "clear-system-logs".to_string(),
            ActionDefinition::new(
                "clear-system-logs",
                "Clear Old System Logs (macOS)",
                "macos",
                vec![
                    "sudo rm -rf /private/var/log/asl/*.asl 2>/dev/null || true",
                    "sudo rm -rf /private/var/log/DiagnosticMessages/*.asl 2>/dev/null || true"
                ]
            )
        );

        Self {
            actions,
            client: Client::new(),
            jwt_secret: std::env::var("OHFIXIT_JWT_SECRET")
                .unwrap_or_else(|_| "default-secret-change-in-production".to_string()),
        }
    }
}

#[tauri::command]
async fn get_health_status() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "status": "healthy",
        "version": "0.1.0",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "actions_available": 7
    }))
}

#[tauri::command]
async fn execute_rollback(
    app: AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
    action_id: String,
    rollback_id: String,
    token: String,
) -> Result<ActionResult, String> {
    // Extract data from state before async operations
    let (jwt_secret, action, client) = {
        let state = state.lock().unwrap();
        let action = state.actions.get(&action_id)
            .ok_or_else(|| format!("Action '{}' not allowlisted", action_id))?
            .clone();
        (state.jwt_secret.clone(), action, state.client.clone())
    };

    // Validate JWT token
    let validation = Validation::new(Algorithm::HS256);
    let token_data = decode::<Claims>(
        &token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &validation
    ).map_err(|e| format!("Invalid token: {}", e))?;

    let claims = token_data.claims;

    // Check if token is expired
    let now = Utc::now().timestamp() as usize;
    if claims.exp < now {
        return Err("Token expired".to_string());
    }

    if !action.reversible || action.rollback_commands.is_empty() {
        return Err(format!("Action '{}' is not reversible", action_id));
    }

    // Log rollback start
    log::info!("Starting rollback of action: {} (rollback_id: {})", action_id, rollback_id);
    emit_status(&app, &format!("🔄 Rolling back {}...", action.title), "rolling_back");

    // Execute the rollback commands
    let result = execute_commands(&action.rollback_commands).await;

    match result {
        Ok((success, output)) => {
            let message = if success {
                format!("✅ {} rollback completed successfully", action.title)
            } else {
                format!("❌ {} rollback failed", action.title)
            };

            emit_status(&app, &message, if success { "success" } else { "error" });

            // Report rollback result back to server
            if let Err(e) = report_rollback_result(&client, &token, &action_id, &rollback_id, success, &output).await {
                log::error!("Failed to report rollback result: {}", e);
            }

            Ok(ActionResult {
                success,
                message: output.clone(),
                error: if success { None } else { Some(output) },
                artifacts: Some(vec![]),
                rollback_id: None,
            })
        }
        Err(e) => {
            let error_msg = format!("❌ {} rollback execution error: {}", action.title, e);
            emit_status(&app, &error_msg, "error");

            Ok(ActionResult {
                success: false,
                message: error_msg.clone(),
                error: Some(error_msg),
                artifacts: None,
                rollback_id: None,
            })
        }
    }
}

#[tauri::command]
async fn execute_action(
    app: AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
    action_id: String,
    _parameters: String,
    token: String,
) -> Result<ActionResult, String> {
    // Extract data from state before async operations
    let (jwt_secret, action, client) = {
        let state = state.lock().unwrap();
        let action = state.actions.get(&action_id)
            .ok_or_else(|| format!("Action '{}' not allowlisted", action_id))?
            .clone();
        (state.jwt_secret.clone(), action, state.client.clone())
    };

    // Validate JWT token
    let validation = Validation::new(Algorithm::HS256);
    let token_data = decode::<Claims>(
        &token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &validation
    ).map_err(|e| format!("Invalid token: {}", e))?;

    let claims = token_data.claims;

    // Check if token is expired
    let now = Utc::now().timestamp() as usize;
    if claims.exp < now {
        return Err("Token expired".to_string());
    }

    // Check OS compatibility
    #[cfg(target_os = "macos")]
    if action.os != "macos" {
        return Err(format!("Action '{}' not compatible with macOS", action_id));
    }

    // Log execution start
    log::info!("Starting execution of action: {}", action_id);
    emit_status(&app, &format!("⚡ Executing {}...", action.title), "executing");

    // Execute the action
    let result = execute_commands(&action.commands).await;

    match result {
        Ok((success, output)) => {
            let message = if success {
                format!("✅ {} completed successfully", action.title)
            } else {
                format!("❌ {} failed", action.title)
            };

            emit_status(&app, &message, if success { "success" } else { "error" });

            // Report result back to server
            if let Err(e) = report_result(&client, &token, &action_id, success, &output).await {
                log::error!("Failed to report result: {}", e);
            }

            let artifacts = create_artifacts(&action_id, &output);
            Ok(ActionResult {
                success,
                message: output.clone(),
                error: if success { None } else { Some(output.clone()) },
                artifacts: Some(artifacts),
                rollback_id: if action.reversible { Some(uuid::Uuid::new_v4().to_string()) } else { None },
            })
        }
        Err(e) => {
            let error_msg = format!("❌ {} execution error: {}", action.title, e);
            emit_status(&app, &error_msg, "error");

            Ok(ActionResult {
                success: false,
                message: error_msg.clone(),
                error: Some(error_msg),
                artifacts: None,
                rollback_id: None,
            })
        }
    }
}

async fn execute_commands(commands: &[String]) -> Result<(bool, String), String> {
    let mut output = String::new();
    let mut all_success = true;

    for command in commands {
        log::info!("Executing command: {}", command);

        // Parse command into program and args
        let parts: Vec<&str> = command.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }

        let program = parts[0];
        let args = &parts[1..];

        match Command::new(program)
            .args(args)
            .output()
        {
            Ok(result) => {
                let stdout = String::from_utf8_lossy(&result.stdout);
                let stderr = String::from_utf8_lossy(&result.stderr);

                output.push_str(&format!("Command: {}\n", command));
                if !stdout.is_empty() {
                    output.push_str(&format!("Output: {}\n", stdout));
                }
                if !stderr.is_empty() {
                    output.push_str(&format!("Error: {}\n", stderr));
                }

                if !result.status.success() {
                    all_success = false;
                    log::error!("Command failed with exit code: {}", result.status);
                }
            }
            Err(e) => {
                let error_msg = format!("Failed to execute command '{}': {}\n", command, e);
                output.push_str(&error_msg);
                all_success = false;
                log::error!("{}", error_msg);
            }
        }
    }

    Ok((all_success, output))
}

async fn report_result(
    client: &Client,
    token: &str,
    action_id: &str,
    success: bool,
    output: &str,
) -> Result<(), String> {
    // Extract server URL from environment or use default
    let server_url = std::env::var("OHFIXIT_SERVER_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());

    let report_url = format!("{}/api/automation/helper/report", server_url);

    let artifacts = create_artifacts(action_id, output);
    let rollback_point = if success {
        Some(RollbackPoint {
            method: "command_sequence".to_string(),
            data: serde_json::json!({
                "action_id": action_id,
                "timestamp": Utc::now().to_rfc3339(),
                "output_hash": general_purpose::STANDARD.encode(output.as_bytes())
            })
        })
    } else {
        None
    };

    let payload = serde_json::json!({
        "actionId": action_id,
        "success": success,
        "output": output,
        "artifacts": artifacts,
        "rollbackPoint": rollback_point,
        "timestamp": Utc::now().to_rfc3339(),
    });

    match client
        .post(&report_url)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                log::info!("Successfully reported result to server");
                Ok(())
            } else {
                Err(format!("Server returned status: {}", response.status()))
            }
        }
        Err(e) => Err(format!("Failed to report result: {}", e)),
    }
}

async fn report_rollback_result(
    client: &Client,
    token: &str,
    action_id: &str,
    rollback_id: &str,
    success: bool,
    output: &str,
) -> Result<(), String> {
    let server_url = std::env::var("OHFIXIT_SERVER_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());

    let report_url = format!("{}/api/automation/helper/report", server_url);

    let payload = serde_json::json!({
        "actionId": format!("{}_rollback", action_id),
        "rollbackId": rollback_id,
        "success": success,
        "output": output,
        "artifacts": create_artifacts(&format!("{}_rollback", action_id), output),
        "timestamp": Utc::now().to_rfc3339(),
    });

    match client
        .post(&report_url)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                log::info!("Successfully reported rollback result to server");
                Ok(())
            } else {
                Err(format!("Server returned status: {}", response.status()))
            }
        }
        Err(e) => Err(format!("Failed to report rollback result: {}", e)),
    }
}

fn create_artifacts(_action_id: &str, output: &str) -> Vec<ActionArtifact> {
    vec![
        ActionArtifact {
            artifact_type: "execution_log".to_string(),
            uri: None,
            hash: Some(general_purpose::STANDARD.encode(output.as_bytes())),
            data: Some(output.to_string()),
        }
    ]
}

fn emit_status(app: &AppHandle, message: &str, status_type: &str) {
    let _ = app.emit("status-update", serde_json::json!({
        "message": message,
        "type": status_type
    }));
}

#[derive(Serialize, Deserialize)]
struct StatusResponse {
    status: &'static str,
    version: &'static str,
    capabilities: Vec<&'static str>,
}

async fn status_handler() -> Json<StatusResponse> {
    Json(StatusResponse {
        status: "ok",
        version: "0.1.0",
        capabilities: vec![
            "screenshot",
            "system_info",
            "process_list",
            "file_operations",
        ],
    })
}

#[derive(Serialize, Deserialize)]
struct ScreenshotRequest {
    region: Option<serde_json::Value>,
    display: Option<u32>,
    includeCursor: Option<bool>,
    format: Option<String>,
    quality: Option<u8>,
}

#[derive(Serialize, Deserialize)]
struct ScreenshotResponse {
    success: bool,
    data: Option<String>,
    format: Option<String>,
    size: Option<usize>,
    dimensions: Option<serde_json::Value>,
    timestamp: Option<String>,
    error: Option<String>,
    details: Option<String>,
}

async fn screenshot_handler(_payload: Json<ScreenshotRequest>) -> Json<ScreenshotResponse> {
    // Placeholder: implement platform-specific screenshot later.
    Json(ScreenshotResponse {
        success: false,
        data: None,
        format: Some("png".into()),
        size: None,
        dimensions: None,
        timestamp: Some(Utc::now().to_rfc3339()),
        error: Some("Not implemented".into()),
        details: Some("Desktop Helper installed and reachable, but screenshot capture is not yet implemented.".into()),
    })
}

#[derive(Serialize, Deserialize)]
struct AutomationExecuteRequest {
    actionId: String,
    parameters: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize)]
struct AutomationExecuteResponse {
    success: bool,
    output: String,
}

#[derive(Clone)]
struct HttpState {
    actions: HashMap<String, ActionDefinition>,
    client: Client,
    jwt_secret: String,
}

async fn automation_execute_handler(
    State(state): State<HttpState>,
    headers: HeaderMap,
    Json(payload): Json<AutomationExecuteRequest>,
) -> Json<AutomationExecuteResponse> {
    // Bearer token required
    let token = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .unwrap_or("")
        .to_string();

    let validation = Validation::new(Algorithm::HS256);
    let token_data = match decode::<Claims>(
        &token,
        &DecodingKey::from_secret(state.jwt_secret.as_bytes()),
        &validation,
    ) {
        Ok(d) => d,
        Err(_) => {
            return Json(AutomationExecuteResponse { success: false, output: "Unauthorized".into() });
        }
    };
    let claims = token_data.claims;
    let now = Utc::now().timestamp() as usize;
    if claims.exp < now {
        return Json(AutomationExecuteResponse { success: false, output: "Token expired".into() });
    }

    let action = match state.actions.get(&payload.actionId) {
        Some(a) => a.clone(),
        None => return Json(AutomationExecuteResponse { success: false, output: format!("Action '{}' not allowlisted", payload.actionId) }),
    };

    // Execute
    let (ok, out) = match execute_commands(&action.commands).await {
        Ok(v) => v,
        Err(e) => (false, e),
    };

    // Best-effort report back to server
    let _ = report_result(&state.client, &token, &action.id, ok, &out).await;

    Json(AutomationExecuteResponse { success: ok, output: out })
}

#[derive(Serialize, Deserialize)]
struct SystemInfoResponse {
    platform: String,
    version: String,
    arch: String,
    memory: serde_json::Value,
    storage: serde_json::Value,
    uptime: u64,
    userAgent: String,
}

async fn health_scan_handler() -> Json<SystemInfoResponse> {
    let mut sys = System::new_all();
    sys.refresh_all();

    // Memory in bytes
    let total_mem = sys.total_memory() as u64 * 1024;
    let avail_mem = sys.available_memory() as u64 * 1024;
    let used_mem = total_mem.saturating_sub(avail_mem);

    // Storage: sum across disks
    let disks = Disks::new_with_refreshed_list();
    let mut total_disk: u64 = 0;
    let mut avail_disk: u64 = 0;
    for d in disks.list() {
        total_disk = total_disk.saturating_add(d.total_space());
        avail_disk = avail_disk.saturating_add(d.available_space());
    }
    let used_disk = total_disk.saturating_sub(avail_disk);

    let info = SystemInfoResponse {
        platform: std::env::consts::OS.to_string(),
        version: System::kernel_version().unwrap_or_default(),
        arch: std::env::consts::ARCH.to_string(),
        memory: serde_json::json!({
            "total": total_mem,
            "available": avail_mem,
            "used": used_mem,
        }),
        storage: serde_json::json!({
            "total": total_disk,
            "available": avail_disk,
            "used": used_disk,
        }),
        uptime: System::uptime(),
        userAgent: "ohfixit-desktop-helper".to_string(),
    };

    Json(info)
}

#[derive(Serialize, Deserialize)]
struct UpdatesResponse {
    supported: bool,
    pending: u32,
    raw: String,
}

#[derive(Serialize, Deserialize)]
struct FirewallResponse {
    supported: bool,
    enabled: bool,
    raw: String,
}

#[derive(Serialize, Deserialize)]
struct AvResponse {
    supported: bool,
    gatekeeper_enabled: bool,
    third_party_detected: bool,
    products: Vec<String>,
    xprotect_version: Option<String>,
    raw: String,
}

#[derive(Serialize, Deserialize)]
struct FileVaultResponse {
    supported: bool,
    enabled: bool,
    raw: String,
}

#[derive(Serialize, Deserialize)]
struct TimeMachineResponse {
    supported: bool,
    configured: bool,
    running: bool,
    latest_backup: Option<String>,
    raw: String,
}

#[derive(Serialize, Deserialize)]
struct SipResponse {
    supported: bool,
    enabled: bool,
    raw: String,
}

fn run_command_capture(cmd: &str, args: &[&str]) -> (bool, String) {
    match Command::new(cmd).args(args).output() {
        Ok(out) => {
            let mut combined = String::new();
            combined.push_str(&String::from_utf8_lossy(&out.stdout));
            let stderr = String::from_utf8_lossy(&out.stderr);
            if !stderr.trim().is_empty() {
                combined.push_str("\n");
                combined.push_str(&stderr);
            }
            (out.status.success(), combined)
        }
        Err(e) => (false, format!("{}", e)),
    }
}

#[cfg(target_os = "macos")]
async fn macos_updates_handler() -> Json<UpdatesResponse> {
    let (_ok, out) = run_command_capture("/usr/sbin/softwareupdate", &["-l", "--no-scan"]);
    let pending = if out.contains("No new software available.") {
        0
    } else {
        out.lines()
            .filter(|l| l.trim_start().starts_with('*') || l.contains("Label:"))
            .count() as u32
    };
    Json(UpdatesResponse { supported: true, pending, raw: out })
}

#[cfg(not(target_os = "macos"))]
async fn macos_updates_handler() -> Json<UpdatesResponse> {
    Json(UpdatesResponse { supported: false, pending: 0, raw: String::new() })
}

#[cfg(target_os = "macos")]
async fn macos_firewall_handler() -> Json<FirewallResponse> {
    let (_ok, out) = run_command_capture(
        "/usr/libexec/ApplicationFirewall/socketfilterfw",
        &["--getglobalstate"],
    );
    let enabled = out.contains("enabled") || out.contains("State = 1");
    Json(FirewallResponse { supported: true, enabled, raw: out })
}

#[cfg(not(target_os = "macos"))]
async fn macos_firewall_handler() -> Json<FirewallResponse> {
    Json(FirewallResponse { supported: false, enabled: false, raw: String::new() })
}

#[cfg(target_os = "macos")]
async fn macos_av_handler() -> Json<AvResponse> {
    let (_ok, spctl_out) = run_command_capture("/usr/sbin/spctl", &["--status"]);
    let gatekeeper = spctl_out.to_lowercase().contains("assessments enabled");

    // List processes and search for common AV names
    let (_ok, ps_out) = run_command_capture("/bin/ps", &["-A", "-o", "comm"]);
    let patterns = [
        "Sophos", "Malwarebytes", "McAfee", "Symantec", "Norton", "CrowdStrike",
        "SentinelOne", "Defender", "ESET", "Avast", "AVG",
    ];
    let mut products: Vec<String> = Vec::new();
    for pat in patterns.iter() {
        if ps_out.contains(pat) { products.push(pat.to_string()); }
    }
    let third_party = !products.is_empty();

    // Try to read XProtect bundle version
    let mut xprotect_version: Option<String> = None;
    let candidates = vec![
        ("/System/Library/CoreServices/XProtect.bundle/Contents/Info.plist", vec!["/usr/bin/defaults", "read", "/System/Library/CoreServices/XProtect.bundle/Contents/Info", "CFBundleShortVersionString"]),
        ("/Library/Apple/System/Library/CoreServices/XProtect.app/Contents/Info.plist", vec!["/usr/bin/defaults", "read", "/Library/Apple/System/Library/CoreServices/XProtect.app/Contents/Info", "CFBundleShortVersionString"]),
    ];
    for (plist, cmd) in candidates {
        if std::path::Path::new(plist).exists() {
            let (_ok, out) = run_command_capture(cmd[0], &cmd[1..]);
            let v = out.trim();
            if !v.is_empty() { xprotect_version = Some(v.to_string()); break; }
        }
    }

    let raw = format!("spctl: {}\nprocesses: {}", spctl_out.trim(), products.join(", "));
    Json(AvResponse { supported: true, gatekeeper_enabled: gatekeeper, third_party_detected: third_party, products, xprotect_version, raw })
}

#[cfg(not(target_os = "macos"))]
async fn macos_av_handler() -> Json<AvResponse> {
    Json(AvResponse { supported: false, gatekeeper_enabled: false, third_party_detected: false, products: vec![], xprotect_version: None, raw: String::new() })
}

#[cfg(target_os = "macos")]
async fn macos_filevault_handler() -> Json<FileVaultResponse> {
    let (_ok, out) = run_command_capture("/usr/bin/fdesetup", &["status"]);
    let enabled = out.to_lowercase().contains("filevault is on");
    Json(FileVaultResponse { supported: true, enabled, raw: out })
}

#[cfg(not(target_os = "macos"))]
async fn macos_filevault_handler() -> Json<FileVaultResponse> {
    Json(FileVaultResponse { supported: false, enabled: false, raw: String::new() })
}

#[cfg(target_os = "macos")]
async fn macos_timemachine_handler() -> Json<TimeMachineResponse> {
    let (_ok1, status_out) = run_command_capture("/usr/bin/tmutil", &["status"]);
    let running = status_out.contains("Running = 1");
    let (_ok2, latest_out) = run_command_capture("/usr/bin/tmutil", &["latestbackup"]);
    let configured = !latest_out.trim().is_empty() && !latest_out.contains("(null)");
    let latest_backup = if configured { Some(latest_out.trim().to_string()) } else { None };
    let raw = format!("status: {}\nlatest: {}", status_out.trim(), latest_out.trim());
    Json(TimeMachineResponse { supported: true, configured, running, latest_backup, raw })
}

#[cfg(not(target_os = "macos"))]
async fn macos_timemachine_handler() -> Json<TimeMachineResponse> {
    Json(TimeMachineResponse { supported: false, configured: false, running: false, latest_backup: None, raw: String::new() })
}

#[cfg(target_os = "macos")]
async fn macos_sip_handler() -> Json<SipResponse> {
    let (_ok, out) = run_command_capture("/usr/bin/csrutil", &["status"]);
    let enabled = out.to_lowercase().contains("enabled");
    Json(SipResponse { supported: true, enabled, raw: out })
}

#[cfg(not(target_os = "macos"))]
async fn macos_sip_handler() -> Json<SipResponse> {
    Json(SipResponse { supported: false, enabled: false, raw: String::new() })
}

fn spawn_status_server() {
    tauri::async_runtime::spawn(async move {
        let http_state = HttpState {
            actions: AppState::new().actions,
            client: Client::new(),
            jwt_secret: std::env::var("OHFIXIT_JWT_SECRET")
                .unwrap_or_else(|_| "default-secret-change-in-production".to_string()),
        };
        let cors = CorsLayer::new()
            .allow_methods(Any)
            .allow_headers(Any)
            .allow_origin(Any);

        let app = Router::new()
            .route("/status", get(status_handler))
            .route("/screenshot", post(screenshot_handler))
            .route("/automation/execute", post(automation_execute_handler))
            .route("/health/scan", get(health_scan_handler))
            .route("/health/macos/updates", get(macos_updates_handler))
            .route("/health/macos/firewall", get(macos_firewall_handler))
            .route("/health/macos/av", get(macos_av_handler))
            .route("/health/macos/filevault", get(macos_filevault_handler))
            .route("/health/macos/timemachine", get(macos_timemachine_handler))
            .route("/health/macos/sip", get(macos_sip_handler))
            .with_state(http_state)
            .layer(cors);
        let addr: SocketAddr = "127.0.0.1:8765".parse().unwrap();
        if let Ok(listener) = tokio::net::TcpListener::bind(addr).await {
            let _ = axum::serve(listener, app).await;
        } else {
            log::warn!("Port 8765 already in use; status server not started");
        }
    });
}

fn main() {
    // start local status server to satisfy /api/desktop/status checks
    spawn_status_server();

    tauri::Builder::default()
        .manage(Mutex::new(AppState::new()))
        .invoke_handler(tauri::generate_handler![execute_action, execute_rollback, get_health_status])
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
