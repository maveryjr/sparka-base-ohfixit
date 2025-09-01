import { z } from 'zod';

// Shared action preview contract used by server routes and UI
export const ActionPreviewSchema = z.object({
  description: z.string(),
  commands: z.array(z.string()),
  risks: z.array(z.string()).default([]),
  reversible: z.boolean().default(false),
  estimatedTime: z.string().default(''),
  requirements: z.array(z.string()).default([]),
  previewDiff: z.string().optional(),
});
export type ActionPreview = z.infer<typeof ActionPreviewSchema>;

// Validate only the data (non-function) portion with Zod; keep function typed via TS
const ActionDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  os: z.enum(['macos', 'windows', 'linux']).or(z.literal('any')).default('any'),
  category: z.string().default('general'),
  implementation: z.object({
    commands: z.array(z.string()).default([]),
    reversible: z.boolean().default(false),
    requirements: z.array(z.string()).default([]),
    risks: z.array(z.string()).default([]),
    estimatedTime: z.string().default(''),
    description: z.string(),
  }),
});

export type ActionDefinition = z.infer<typeof ActionDataSchema> & {
  parameterize?: (params?: Record<string, any>) => { commands?: string[]; previewDiff?: string };
};

// Minimal allowlist to start Phase 0/1 vertical slice
const ACTIONS: Record<string, ActionDefinition> = {
  'flush-dns-macos': {
    id: 'flush-dns-macos',
    title: 'Flush DNS Cache (macOS)',
    os: 'macos',
    category: 'network',
    implementation: {
      description: 'Flush the DNS cache to resolve name resolution issues',
      commands: ['sudo dscacheutil -flushcache', 'sudo killall -HUP mDNSResponder'],
      risks: ['Temporary loss of cached DNS entries'],
      reversible: false,
      estimatedTime: '5 seconds',
      requirements: ['Administrator privileges'],
    },
  },
  'toggle-wifi-macos': {
    id: 'toggle-wifi-macos',
    title: 'Toggle Wi‑Fi (macOS)',
    os: 'macos',
    category: 'network',
    implementation: {
      description: 'Toggle Wi‑Fi off and back on to reset the interface',
      commands: ['networksetup -setairportpower en0 off', 'sleep 2', 'networksetup -setairportpower en0 on'],
      risks: ['Temporary loss of connectivity'],
      reversible: true,
      estimatedTime: '10–20 seconds',
      requirements: ['Administrator privileges'],
    },
  },
  'clear-app-cache': {
    id: 'clear-app-cache',
    title: 'Clear App Cache (macOS home dir)',
    os: 'macos',
    category: 'storage',
    implementation: {
      description: 'Move app cache to backup to free space and reset cache state',
      commands: ['mv ~/Library/Caches/com.example.app ~/Desktop/app-cache-backup-$(date +%s)'],
      risks: ['App may rebuild cache on next launch'],
      reversible: true,
      estimatedTime: '30–60 seconds',
      requirements: ['App not running'],
    },
    parameterize: (params?: Record<string, any>) => {
      const bundle = params?.bundleId as string | undefined;
      if (!bundle) return {};
      return {
        commands: [
          `mv ~/Library/Caches/${bundle} ~/Desktop/${bundle}-cache-backup-$(date +%s)`,
        ],
      };
    },
  },
  'restart-finder': {
    id: 'restart-finder',
    title: 'Restart Finder (macOS)',
    os: 'macos',
    category: 'system',
    implementation: {
      description: 'Restart the Finder application to refresh the desktop and file views',
      commands: ['killall Finder'],
      risks: ['Temporary loss of Finder windows'],
      reversible: true,
      estimatedTime: '5 seconds',
      requirements: ['None'],
    },
  },
  'clear-recent-items': {
    id: 'clear-recent-items',
    title: 'Clear Recent Items (macOS)',
    os: 'macos',
    category: 'privacy',
    implementation: {
      description: 'Clear recent applications, documents, and servers from system menus',
      commands: [
        'defaults delete com.apple.recentitems RecentApplications 2>/dev/null || true',
        'defaults delete com.apple.recentitems RecentDocuments 2>/dev/null || true',
        'defaults delete com.apple.recentitems RecentServers 2>/dev/null || true',
      ],
      risks: ['Loss of recent items history'],
      reversible: false,
      estimatedTime: '2 seconds',
      requirements: ['None'],
    },
  },
  'reset-launchpad': {
    id: 'reset-launchpad',
    title: 'Reset Launchpad Layout (macOS)',
    os: 'macos',
    category: 'system',
    implementation: {
      description: 'Reset Launchpad to default layout and restart Dock',
      commands: [
        'defaults write com.apple.dock ResetLaunchPad -bool true',
        'killall Dock',
      ],
      risks: ['Launchpad layout will be reset to default'],
      reversible: false,
      estimatedTime: '10 seconds',
      requirements: ['None'],
    },
  },
  'clear-system-logs': {
    id: 'clear-system-logs',
    title: 'Clear Old System Logs (macOS)',
    os: 'macos',
    category: 'maintenance',
    implementation: {
      description: 'Remove old system log files to free up disk space',
      commands: [
        'sudo rm -rf /private/var/log/asl/*.asl 2>/dev/null || true',
        'sudo rm -rf /private/var/log/DiagnosticMessages/*.asl 2>/dev/null || true',
      ],
      risks: ['Loss of old system logs'],
      reversible: false,
      estimatedTime: '30 seconds',
      requirements: ['Administrator privileges'],
    },
  },
};

export function getActionDefinition(actionId: string): ActionDefinition | null {
  return ACTIONS[actionId] ?? null;
}

export function listAllowlistedActions(): ActionDefinition[] {
  return Object.values(ACTIONS);
}

export function generateActionPreview(actionId: string, parameters?: Record<string, any>): ActionPreview {
  const def = getActionDefinition(actionId);
  if (!def) {
    throw new Error(`Unknown or not-allowlisted action: ${actionId}`);
  }
  const param = def.parameterize?.(parameters) ?? {};
  const commands = param.commands ?? def.implementation.commands;
  return ActionPreviewSchema.parse({
    description: def.implementation.description,
    commands,
    risks: def.implementation.risks,
    reversible: def.implementation.reversible,
    estimatedTime: def.implementation.estimatedTime,
    requirements: def.implementation.requirements,
    previewDiff: param.previewDiff,
  });
}
