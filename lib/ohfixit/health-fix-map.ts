import { z } from 'zod';

// Map health check IDs to allowlisted automation actions and optional parameter builders
// Keep mappings conservative and reversible where possible
export const healthFixMap = {
  'dns-health': {
    actionId: 'flush-dns-macos',
  },
  'network-connectivity': {
    actionId: 'toggle-wifi-macos',
  },
  'temp-files': {
    actionId: 'clear-system-logs',
  },
  // For app-specific caches, we would need a bundleId parameter. Skip for now.
  // 'memory-usage': no direct safe action; recommend user-close tabs
  // 'system-updates': requires privileged helper implementation
  // 'antivirus-status': requires helper
  // 'startup-programs': requires helper
  // 'browser-extensions': not supported from web
  // 'default-browser': guidance only
  // 'time-sync': helper or OS UI
} as const;

export const HealthFixRequestSchema = z.object({
  chatId: z.string().optional(),
  checkId: z.string(),
});

export type HealthFixRequest = z.infer<typeof HealthFixRequestSchema>;

export function resolveHealthFix(checkId: string): { actionId: string; parameters?: Record<string, any> } | null {
  const entry = (healthFixMap as Record<string, { actionId: string; parameters?: Record<string, any> } | undefined>)[checkId];
  if (!entry) return null;
  return entry;
}
