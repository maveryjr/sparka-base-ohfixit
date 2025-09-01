#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::collections::HashMap;
use std::process::Command;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use chrono::Utc;
use reqwest::Client;

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
    artifacts: Option<Vec<String>>,
    rollback_id: Option<String>,
}

// Allowlisted action definitions
#[derive(Debug, Clone)]
struct ActionDefinition {
    id: String,
    title: String,
    os: String,
    commands: Vec<String>,
    reversible: bool,
    estimated_time: String,
    requirements: Vec<String>,
}

impl ActionDefinition {
    fn new(id: &str, title: &str, os: &str, commands: Vec<&str>) -> Self {
        Self {
            id: id.to_string(),
            title: title.to_string(),
            os: os.to_string(),
            commands: commands.iter().map(|s| s.to_string()).collect(),
            reversible: true,
            estimated_time: "10 seconds".to_string(),
            requirements: vec!["Administrator privileges".to_string()],
        }
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

        // Initialize allowlisted actions for macOS
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
                    "networksetup -setairportpower en0 off",
                    "sleep 2",
                    "networksetup -setairportpower en0 on"
                ]
            )
        );

        actions.insert(
            "clear-app-cache".to_string(),
            ActionDefinition::new(
                "clear-app-cache",
                "Clear App Cache (macOS)",
                "macos",
                vec![
                    "find ~/Library/Caches -name \"*.cache\" -type f -delete 2>/dev/null || true"
                ]
            )
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

            Ok(ActionResult {
                success,
                message: output.clone(),
                error: if success { None } else { Some(output) },
                artifacts: Some(vec![]), // TODO: Add artifact collection
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

    let payload = serde_json::json!({
        "actionId": action_id,
        "success": success,
        "output": output,
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

fn emit_status(app: &AppHandle, message: &str, status_type: &str) {
    let _ = app.emit("status-update", serde_json::json!({
        "message": message,
        "type": status_type
    }));
}

fn main() {
    tauri::Builder::default()
        .manage(Mutex::new(AppState::new()))
        .invoke_handler(tauri::generate_handler![execute_action])
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}