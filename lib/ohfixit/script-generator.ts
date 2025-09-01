import 'server-only';

import { z } from 'zod';

// Script generation schemas
export const ScriptTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['network', 'system', 'browser', 'file', 'security']),
  platforms: z.array(z.enum(['windows', 'macos', 'linux'])),
  riskLevel: z.enum(['low', 'medium', 'high']),
  requiresAdmin: z.boolean(),
  template: z.string(),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'path', 'url']),
    description: z.string(),
    required: z.boolean(),
    defaultValue: z.any().optional(),
    validation: z.string().optional()
  })),
  previewCommand: z.string().optional(),
  testCommand: z.string().optional(),
  rollbackScript: z.string().optional()
});

export const GeneratedScriptSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  name: z.string(),
  description: z.string(),
  platform: z.enum(['windows', 'macos', 'linux']),
  shell: z.enum(['bash', 'zsh', 'powershell', 'cmd']),
  script: z.string(),
  previewOutput: z.string(),
  riskAssessment: z.object({
    level: z.enum(['low', 'medium', 'high']),
    factors: z.array(z.string()),
    mitigations: z.array(z.string())
  }),
  executionTime: z.string(),
  rollbackScript: z.string().optional(),
  requiresConsent: z.boolean(),
  consentMessage: z.string()
});

export type ScriptTemplate = z.infer<typeof ScriptTemplateSchema>;
export type GeneratedScript = z.infer<typeof GeneratedScriptSchema>;

// Built-in script templates
export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'network-reset',
    name: 'Network Connection Reset',
    description: 'Reset network adapters and flush DNS to resolve connectivity issues',
    category: 'network',
    platforms: ['windows', 'macos', 'linux'],
    riskLevel: 'medium',
    requiresAdmin: true,
    template: `#!/bin/bash
# Network Reset Script for {{platform}}
echo "Starting network reset..."

{{#if platform === 'macos'}}
# Flush DNS cache
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
echo "DNS cache flushed"

# Reset network interfaces
sudo ifconfig en0 down
sudo ifconfig en0 up
echo "Network interface reset"
{{/if}}

{{#if platform === 'windows'}}
# Flush DNS cache
ipconfig /flushdns
echo "DNS cache flushed"

# Reset network adapters
netsh winsock reset
netsh int ip reset
echo "Network stack reset"
{{/if}}

{{#if platform === 'linux'}}
# Flush DNS cache
sudo systemctl restart systemd-resolved
echo "DNS service restarted"

# Reset network manager
sudo systemctl restart NetworkManager
echo "Network manager restarted"
{{/if}}

echo "Network reset complete. Please restart your computer for full effect."`,
    variables: [
      {
        name: 'platform',
        type: 'string',
        description: 'Target platform',
        required: true
      }
    ],
    previewCommand: 'echo "This script will reset network settings and flush DNS cache"',
    rollbackScript: 'echo "Network settings reset. Restart required to fully revert."'
  },
  {
    id: 'browser-cleanup',
    name: 'Browser Cache and Data Cleanup',
    description: 'Clear browser cache, cookies, and temporary data',
    category: 'browser',
    platforms: ['windows', 'macos', 'linux'],
    riskLevel: 'low',
    requiresAdmin: false,
    template: `#!/bin/bash
# Browser Cleanup Script
echo "Starting browser cleanup..."

{{#if browser === 'chrome'}}
# Chrome cleanup paths
{{#if platform === 'macos'}}
CHROME_PATH="$HOME/Library/Application Support/Google/Chrome"
{{/if}}
{{#if platform === 'windows'}}
CHROME_PATH="$APPDATA/Google/Chrome"
{{/if}}
{{#if platform === 'linux'}}
CHROME_PATH="$HOME/.config/google-chrome"
{{/if}}

# Close Chrome if running
pkill -f "Google Chrome" 2>/dev/null || true

# Clear cache and temporary data
rm -rf "$CHROME_PATH/Default/Cache"/*
rm -rf "$CHROME_PATH/Default/Code Cache"/*
rm -rf "$CHROME_PATH/Default/GPUCache"/*
{{#if clearCookies}}
rm -f "$CHROME_PATH/Default/Cookies"
rm -f "$CHROME_PATH/Default/Cookies-journal"
{{/if}}
echo "Chrome cleanup complete"
{{/if}}

{{#if browser === 'firefox'}}
# Firefox cleanup
FIREFOX_PATH="$HOME/.mozilla/firefox"
{{#if platform === 'macos'}}
FIREFOX_PATH="$HOME/Library/Application Support/Firefox"
{{/if}}

# Find default profile
PROFILE=$(find "$FIREFOX_PATH" -name "*.default*" -type d | head -1)
if [ -n "$PROFILE" ]; then
  rm -rf "$PROFILE/cache2"/*
  rm -rf "$PROFILE/startupCache"/*
  {{#if clearCookies}}
  rm -f "$PROFILE/cookies.sqlite"
  {{/if}}
  echo "Firefox cleanup complete"
fi
{{/if}}

echo "Browser cleanup finished"`,
    variables: [
      {
        name: 'browser',
        type: 'string',
        description: 'Browser to clean (chrome, firefox, safari)',
        required: true,
        defaultValue: 'chrome'
      },
      {
        name: 'clearCookies',
        type: 'boolean',
        description: 'Also clear cookies and login data',
        required: false,
        defaultValue: false
      },
      {
        name: 'platform',
        type: 'string',
        description: 'Operating system',
        required: true
      }
    ]
  },
  {
    id: 'disk-cleanup',
    name: 'Disk Space Cleanup',
    description: 'Clean temporary files and free up disk space',
    category: 'system',
    platforms: ['windows', 'macos', 'linux'],
    riskLevel: 'medium',
    requiresAdmin: false,
    template: `#!/bin/bash
# Disk Cleanup Script
echo "Starting disk cleanup..."

{{#if platform === 'macos'}}
# Clean system caches
rm -rf ~/Library/Caches/*
echo "User caches cleared"

# Clean Downloads folder of old files
find ~/Downloads -type f -mtime +{{daysOld}} -delete 2>/dev/null
echo "Old downloads cleaned"

# Empty trash
rm -rf ~/.Trash/*
echo "Trash emptied"

# Clean system logs (if admin)
{{#if cleanSystemFiles}}
sudo rm -rf /var/log/*.log
sudo rm -rf /Library/Logs/*
echo "System logs cleaned"
{{/if}}
{{/if}}

{{#if platform === 'windows'}}
# Clean temp files
del /q /s "%TEMP%\\*"
del /q /s "%TMP%\\*"
echo "Temp files cleaned"

# Clean recycle bin
rd /s /q C:\\$Recycle.Bin 2>nul
echo "Recycle bin emptied"

# Run disk cleanup utility
{{#if cleanSystemFiles}}
cleanmgr /sagerun:1
echo "System cleanup completed"
{{/if}}
{{/if}}

{{#if platform === 'linux'}}
# Clean package cache
sudo apt-get clean 2>/dev/null || sudo yum clean all 2>/dev/null
echo "Package cache cleaned"

# Clean temp files
rm -rf /tmp/*
rm -rf ~/.cache/*
echo "Cache files cleaned"

# Clean old logs
{{#if cleanSystemFiles}}
sudo journalctl --vacuum-time=7d
echo "System logs cleaned"
{{/if}}
{{/if}}

echo "Disk cleanup complete"`,
    variables: [
      {
        name: 'daysOld',
        type: 'number',
        description: 'Delete files older than this many days',
        required: false,
        defaultValue: 30
      },
      {
        name: 'cleanSystemFiles',
        type: 'boolean',
        description: 'Also clean system files (requires admin)',
        required: false,
        defaultValue: false
      },
      {
        name: 'platform',
        type: 'string',
        description: 'Operating system',
        required: true
      }
    ]
  },
  {
    id: 'malware-scan',
    name: 'Quick Malware Scan',
    description: 'Run basic malware detection and removal',
    category: 'security',
    platforms: ['windows', 'macos'],
    riskLevel: 'low',
    requiresAdmin: true,
    template: `#!/bin/bash
# Quick Malware Scan
echo "Starting malware scan..."

{{#if platform === 'windows'}}
# Run Windows Defender quick scan
"%ProgramFiles%\\Windows Defender\\MpCmdRun.exe" -Scan -ScanType 1
echo "Windows Defender scan complete"

# Check for suspicious processes
tasklist | findstr /i "{{suspiciousProcess}}"
{{/if}}

{{#if platform === 'macos'}}
# Check for suspicious processes
ps aux | grep -i "{{suspiciousProcess}}"

# Scan common malware locations
find /Applications -name "*.app" -path "*/MacOS/*" -exec file {} \\; | grep -i suspicious
find ~/Library/LaunchAgents -name "*.plist" -newer {{scanDate}}
echo "macOS security scan complete"
{{/if}}

echo "Scan finished. Review output for any suspicious findings."`,
    variables: [
      {
        name: 'suspiciousProcess',
        type: 'string',
        description: 'Process name to search for',
        required: false,
        defaultValue: 'malware'
      },
      {
        name: 'scanDate',
        type: 'string',
        description: 'Scan for files newer than this date',
        required: false,
        defaultValue: '7 days ago'
      }
    ]
  }
];

export class ScriptGenerator {
  private templates: Map<string, ScriptTemplate> = new Map();

  constructor() {
    // Load built-in templates
    SCRIPT_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  addTemplate(template: ScriptTemplate): void {
    this.templates.set(template.id, template);
  }

  getTemplate(id: string): ScriptTemplate | undefined {
    return this.templates.get(id);
  }

  getTemplatesByCategory(category: string): ScriptTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.category === category);
  }

  getTemplatesByPlatform(platform: string): ScriptTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.platforms.includes(platform as any));
  }

  async generateScript(
    templateId: string,
    variables: Record<string, any>,
    platform: 'windows' | 'macos' | 'linux'
  ): Promise<GeneratedScript> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Validate variables
    this.validateVariables(template, variables);

    // Generate script content
    const script = this.processTemplate(template.template, { ...variables, platform });
    
    // Generate preview
    const previewOutput = template.previewCommand 
      ? this.processTemplate(template.previewCommand, variables)
      : 'No preview available';

    // Assess risk
    const riskAssessment = this.assessRisk(template, variables);

    // Determine shell
    const shell = this.getShellForPlatform(platform);

    // Generate rollback script if template has one
    const rollbackScript = template.rollbackScript 
      ? this.processTemplate(template.rollbackScript, variables)
      : undefined;

    return {
      id: `script-${Date.now()}`,
      templateId,
      name: template.name,
      description: template.description,
      platform,
      shell,
      script,
      previewOutput,
      riskAssessment,
      executionTime: this.estimateExecutionTime(template, variables),
      rollbackScript,
      requiresConsent: riskAssessment.level !== 'low' || template.requiresAdmin,
      consentMessage: this.generateConsentMessage(template, riskAssessment)
    };
  }

  private validateVariables(template: ScriptTemplate, variables: Record<string, any>): void {
    for (const variable of template.variables) {
      if (variable.required && !(variable.name in variables)) {
        throw new Error(`Required variable missing: ${variable.name}`);
      }

      if (variable.name in variables) {
        const value = variables[variable.name];
        
        // Type validation
        switch (variable.type) {
          case 'number':
            if (typeof value !== 'number') {
              throw new Error(`Variable ${variable.name} must be a number`);
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean') {
              throw new Error(`Variable ${variable.name} must be a boolean`);
            }
            break;
          case 'path':
            if (typeof value !== 'string' || !this.isValidPath(value)) {
              throw new Error(`Variable ${variable.name} must be a valid path`);
            }
            break;
          case 'url':
            if (typeof value !== 'string' || !this.isValidUrl(value)) {
              throw new Error(`Variable ${variable.name} must be a valid URL`);
            }
            break;
        }

        // Custom validation
        if (variable.validation) {
          const regex = new RegExp(variable.validation);
          if (!regex.test(String(value))) {
            throw new Error(`Variable ${variable.name} failed validation`);
          }
        }
      }
    }
  }

  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;

    // Simple template processing (replace {{variable}} with values)
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, String(value));
    });

    // Process conditional blocks {{#if condition}}...{{/if}}
    processed = this.processConditionals(processed, variables);

    return processed;
  }

  private processConditionals(template: string, variables: Record<string, any>): string {
    const ifRegex = /{{#if\s+(.+?)}}([\s\S]*?){{\/if}}/g;
    
    return template.replace(ifRegex, (match, condition, content) => {
      if (this.evaluateCondition(condition, variables)) {
        return content;
      }
      return '';
    });
  }

  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    // Simple condition evaluation
    // Support: variable === 'value', variable, !variable
    
    if (condition.includes('===')) {
      const [left, right] = condition.split('===').map(s => s.trim());
      const leftValue = variables[left] || left.replace(/['"]/g, '');
      const rightValue = right.replace(/['"]/g, '');
      return leftValue === rightValue;
    }

    if (condition.startsWith('!')) {
      const variable = condition.slice(1).trim();
      return !variables[variable];
    }

    return !!variables[condition.trim()];
  }

  private assessRisk(template: ScriptTemplate, variables: Record<string, any>): {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigations: string[];
  } {
    const factors: string[] = [];
    const mitigations: string[] = [];
    let level = template.riskLevel;

    if (template.requiresAdmin) {
      factors.push('Requires administrator privileges');
      mitigations.push('Script will prompt for admin access');
    }

    if (template.category === 'system') {
      factors.push('Modifies system settings');
      mitigations.push('Changes are logged and can be reverted');
    }

    if (template.category === 'file') {
      factors.push('Modifies or deletes files');
      mitigations.push('Backups created before modifications');
    }

    // Check variables for risky values
    if (variables.cleanSystemFiles) {
      factors.push('Will clean system files');
      level = 'high';
    }

    if (variables.clearCookies) {
      factors.push('Will clear browser cookies and login data');
      mitigations.push('You may need to log in to websites again');
    }

    return { level, factors, mitigations };
  }

  private getShellForPlatform(platform: string): 'bash' | 'zsh' | 'powershell' | 'cmd' {
    switch (platform) {
      case 'windows':
        return 'powershell';
      case 'macos':
        return 'zsh';
      case 'linux':
        return 'bash';
      default:
        return 'bash';
    }
  }

  private estimateExecutionTime(template: ScriptTemplate, variables: Record<string, any>): string {
    // Simple time estimation based on template category and variables
    switch (template.category) {
      case 'network':
        return '2-5 minutes';
      case 'system':
        return variables.cleanSystemFiles ? '10-30 minutes' : '5-10 minutes';
      case 'browser':
        return '1-3 minutes';
      case 'file':
        return '3-10 minutes';
      case 'security':
        return '5-15 minutes';
      default:
        return '2-5 minutes';
    }
  }

  private generateConsentMessage(template: ScriptTemplate, riskAssessment: any): string {
    let message = `This script will ${template.description.toLowerCase()}.`;
    
    if (template.requiresAdmin) {
      message += ' Administrator privileges are required.';
    }

    if (riskAssessment.level === 'high') {
      message += ' This is a high-risk operation that may significantly change your system.';
    }

    if (riskAssessment.factors.length > 0) {
      message += ` Risk factors: ${riskAssessment.factors.join(', ')}.`;
    }

    message += ' Do you want to proceed?';

    return message;
  }

  private isValidPath(path: string): boolean {
    // Basic path validation
    return typeof path === 'string' && path.length > 0 && !path.includes('<') && !path.includes('>');
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  getAllTemplates(): ScriptTemplate[] {
    return Array.from(this.templates.values());
  }
}
