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
