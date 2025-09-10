/**
 * OhFixIt Desktop Helper Architecture
 * 
 * This file defines the architecture for a secure desktop application
 * that can perform native OS automation tasks with strict sandboxing
 * and user consent requirements.
 */

export interface DesktopCapability {
  id: string;
  name: string;
  description: string;
  category: 'network' | 'system' | 'hardware' | 'security';
  riskLevel: 'low' | 'medium' | 'high';
  permissions: string[];
  platforms: ('windows' | 'macos' | 'linux')[];
}

export interface AutomationAction {
  id: string;
  type: 'command' | 'registry' | 'file' | 'service' | 'network';
  description: string;
  command?: string;
  parameters?: Record<string, any>;
  permissions?: string[];
  reversible: boolean;
  backupRequired: boolean;
  estimatedTime: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface DesktopSession {
  id: string;
  userId: string;
  chatId: string;
  capabilities: DesktopCapability[];
  permissions: string[];
  startTime: Date;
  expiresAt: Date;
  isActive: boolean;
}

// Available desktop capabilities
export const DESKTOP_CAPABILITIES: DesktopCapability[] = [
  {
    id: 'wifi-reset',
    name: 'Wi-Fi Network Reset',
    description: 'Reset network adapters and flush DNS cache',
    category: 'network',
    riskLevel: 'low',
    permissions: ['network.manage', 'system.restart_services'],
    platforms: ['windows', 'macos', 'linux']
  },
  {
    id: 'printer-management',
    name: 'Printer Management',
    description: 'Install, remove, and configure printers',
    category: 'hardware',
    riskLevel: 'medium',
    permissions: ['hardware.printers', 'system.install_drivers'],
    platforms: ['windows', 'macos']
  },
  {
    id: 'system-cleanup',
    name: 'System Cleanup',
    description: 'Clean temporary files and optimize system performance',
    category: 'system',
    riskLevel: 'low',
    permissions: ['filesystem.temp', 'system.cleanup'],
    platforms: ['windows', 'macos', 'linux']
  },
  {
    id: 'firewall-config',
    name: 'Firewall Configuration',
    description: 'Configure Windows Firewall or macOS firewall settings',
    category: 'security',
    riskLevel: 'high',
    permissions: ['security.firewall', 'system.admin'],
    platforms: ['windows', 'macos']
  },
  {
    id: 'startup-management',
    name: 'Startup Programs',
    description: 'Manage programs that start with Windows/macOS',
    category: 'system',
    riskLevel: 'medium',
    permissions: ['system.startup', 'registry.modify'],
    platforms: ['windows', 'macos']
  }
];

// Platform-specific automation actions
export const AUTOMATION_ACTIONS: Record<string, AutomationAction[]> = {
  'wifi-reset': [
    {
      id: 'flush-dns-windows',
      type: 'command',
      description: 'Flush DNS cache on Windows',
      command: 'ipconfig /flushdns',
      reversible: false,
      backupRequired: false,
      estimatedTime: '5 seconds',
      riskLevel: 'low'
    },
    {
      id: 'reset-network-adapter-windows',
      type: 'command',
      description: 'Reset network adapter on Windows',
      command: 'netsh winsock reset',
      reversible: true,
      backupRequired: true,
      estimatedTime: '10 seconds',
      riskLevel: 'medium'
    },
    {
      id: 'flush-dns-macos',
      type: 'command',
      description: 'Flush DNS cache on macOS',
      command: 'sudo dscacheutil -flushcache',
      reversible: false,
      backupRequired: false,
      estimatedTime: '5 seconds',
      riskLevel: 'low'
    }
  ],
  'system-cleanup': [
    {
      id: 'clean-temp-windows',
      type: 'file',
      description: 'Clean Windows temporary files',
      parameters: {
        paths: ['%TEMP%', '%TMP%', 'C:\\Windows\\Temp'],
        excludePatterns: ['*.log', '*.tmp']
      },
      reversible: false,
      backupRequired: false,
      estimatedTime: '2 minutes',
      riskLevel: 'low'
    },
    {
      id: 'clean-browser-cache',
      type: 'file',
      description: 'Clean browser cache files',
      parameters: {
        browsers: ['chrome', 'firefox', 'edge', 'safari']
      },
      reversible: false,
      backupRequired: true,
      estimatedTime: '1 minute',
      riskLevel: 'low'
    }
  ]
};

export class DesktopHelperAPI {
  private session: DesktopSession | null = null;
  private wsConnection: WebSocket | null = null;

  constructor(private serverUrl: string) {}

  async requestSession(chatId: string, requiredCapabilities: string[]): Promise<DesktopSession> {
    const response = await fetch(`${this.serverUrl}/api/desktop/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        requiredCapabilities,
        clientInfo: {
          platform: navigator.platform,
          userAgent: navigator.userAgent
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create desktop session');
    }

    const session = (await response.json()) as DesktopSession;
    this.session = session;
    return session;
  }

  async executeAction(actionId: string, parameters?: Record<string, any>): Promise<{
    success: boolean;
    result?: any;
    error?: string;
    backupId?: string;
  }> {
    if (!this.session) {
      throw new Error('No active desktop session');
    }

    const response = await fetch(`${this.serverUrl}/api/desktop/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.session.id,
        actionId,
        parameters
      })
    });

    return await response.json();
  }

  async previewAction(actionId: string, parameters?: Record<string, any>): Promise<{
    description: string;
    commands: string[];
    risks: string[];
    reversible: boolean;
    estimatedTime: string;
  }> {
    const response = await fetch(`${this.serverUrl}/api/desktop/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.session?.id,
        actionId,
        parameters
      })
    });

    return await response.json();
  }

  async rollbackAction(backupId: string): Promise<boolean> {
    if (!this.session) return false;

    const response = await fetch(`${this.serverUrl}/api/desktop/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.session.id,
        backupId
      })
    });

    const result = await response.json();
    return result.success;
  }

  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.session) {
        reject(new Error('No active session'));
        return;
      }

      this.wsConnection = new WebSocket(`${this.serverUrl.replace('http', 'ws')}/ws/desktop/${this.session.id}`);
      
      this.wsConnection.onopen = () => resolve();
      this.wsConnection.onerror = (error) => reject(error);
      
      this.wsConnection.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      };
    });
  }

  private handleWebSocketMessage(data: any) {
    switch (data.type) {
      case 'action_progress':
        // Handle progress updates
        break;
      case 'action_complete':
        // Handle completion
        break;
      case 'permission_request':
        // Handle permission requests
        break;
    }
  }

  disconnect() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.session = null;
  }
}

// Security and sandboxing utilities
export class SecurityManager {
  static validateAction(action: AutomationAction, userPermissions: string[]): boolean {
    return action.permissions?.every(permission => 
      userPermissions.includes(permission)
    ) ?? true;
  }

  static createSandboxedCommand(command: string, platform: string): string {
    // Add platform-specific sandboxing
    switch (platform) {
      case 'windows':
        return `powershell -ExecutionPolicy Restricted -Command "${command}"`;
      case 'macos':
        return `sandbox-exec -f /tmp/ohfixit.sb ${command}`;
      default:
        return command;
    }
  }

  static generateBackupScript(action: AutomationAction): string {
    if (!action.backupRequired) return '';

    switch (action.type) {
      case 'registry':
        return 'reg export HKEY_CURRENT_USER\\Software\\OhFixIt\\Backup backup.reg';
      case 'file':
        return 'xcopy /E /H /Y target_folder backup_folder\\';
      default:
        return '';
    }
  }
}

// Desktop Helper component interface
export interface DesktopHelperProps {
  chatId: string;
  onActionComplete: (result: any) => void;
  onError: (error: string) => void;
}

// Configuration for Tauri/Electron app
export const DESKTOP_APP_CONFIG = {
  tauri: {
    allowlist: {
      all: false,
      shell: {
        all: false,
        execute: true,
        sidecar: false,
        open: false
      },
      fs: {
        all: false,
        readFile: true,
        writeFile: true,
        readDir: true,
        copyFile: true,
        createDir: true,
        removeDir: false,
        removeFile: true,
        renameFile: false
      },
      os: {
        all: false,
        platform: true,
        version: true,
        type: true,
        arch: true
      },
      window: {
        all: false,
        close: true,
        hide: true,
        show: true,
        maximize: false,
        minimize: true,
        unmaximize: false,
        unminimize: true,
        startDragging: false,
        print: false
      }
    },
    security: {
      csp: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    },
    updater: {
      active: true,
      endpoints: ["https://releases.ohfixit.com/{{target}}/{{current_version}}"],
      dialog: true,
      pubkey: "PUBLIC_KEY_HERE"
    }
  },
  electron: {
    nodeIntegration: false,
    contextIsolation: true,
    enableRemoteModule: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false
  }
};
