import 'server-only';

import { tool, type Tool } from 'ai';
import { z } from 'zod';

// Contracts for safe, consent-gated automation proposals
export const OpenUrlActionSchema = z.object({
  type: z.literal('open_url'),
  id: z.string().describe('Stable id for this action'),
  title: z.string().min(3).max(120),
  url: z.string().url(),
  target: z.enum(['_blank', '_self']).default('_blank').optional(),
  rationale: z.string().max(300).optional(),
  preview: z.string().max(300).optional(),
});

export const DomInstructionActionSchema = z.object({
  type: z.literal('dom_instruction'),
  id: z.string().describe('Stable id for this action'),
  title: z.string().min(3).max(120),
  instruction: z
    .string()
    .min(3)
    .max(500)
    .describe('Plain-language instruction for the user to perform within the current page.'),
  selector: z
    .string()
    .max(200)
    .optional()
    .describe('Optional CSS selector of the element to interact with (informational only; not auto-run).'),
  caution: z.string().max(300).optional(),
});

export const ScriptRecommendationActionSchema = z.object({
  type: z.literal('script_recommendation'),
  id: z.string().describe('Stable id for this action'),
  title: z.string().min(3).max(120),
  shell: z.enum(['bash', 'zsh', 'powershell']).default('bash'),
  os: z.enum(['macos', 'windows', 'linux']).optional(),
  script: z.string().min(1).max(4000),
  explanation: z.string().min(3).max(600),
  dryRun: z.boolean().default(true).optional(),
  safetyNotes: z.string().max(400).optional(),
});

export const AutomationActionSchema = z.discriminatedUnion('type', [
  OpenUrlActionSchema,
  DomInstructionActionSchema,
  ScriptRecommendationActionSchema,
]);

export type AutomationAction = z.infer<typeof AutomationActionSchema>;

export const AutomationPlanSchema = z.object({
  summary: z.string().min(3).max(300),
  actions: z.array(AutomationActionSchema).min(1).max(12),
});

export type AutomationPlan = z.infer<typeof AutomationPlanSchema>;

export const AutomationInputsSchema = z.object({
  goal: z.string().min(3).max(300),
  contextHint: z.string().max(500).optional(),
});

export type AutomationInputs = z.infer<typeof AutomationInputsSchema>;

export const automation: Tool<AutomationInputs, AutomationPlan> = tool({
  description:
    'TOOL FOR SYSTEM MAINTENANCE: Use when users ask to clear DNS cache, fix Wi-Fi, restart Finder, clear caches, or troubleshoot network issues. PROVIDES SAFE AUTOMATED SOLUTIONS with user approval required. DO NOT give manual instructions - use this tool instead.',
  inputSchema: AutomationInputsSchema,
  execute: async ({ goal, contextHint }): Promise<AutomationPlan> => {
    const goalLower = goal.toLowerCase();
    const actions: AutomationAction[] = [];

    // Analyze the goal and add relevant actions
    if (goalLower.includes('dns') || goalLower.includes('name resolution') || goalLower.includes('domain') ||
        goalLower.includes('clear dns') || goalLower.includes('flush dns') || goalLower.includes('dns cache')) {
      // DNS-related issues
      actions.push({
        type: 'script_recommendation',
        id: 'script-dns-flush',
        title: 'Flush DNS Cache (macOS)',
        shell: 'bash',
        os: 'macos',
        script: 'sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder',
        explanation: 'Flush the DNS cache to resolve name resolution issues and force fresh DNS lookups.',
        dryRun: false,
        safetyNotes: 'Requires administrator privileges. Safe operation that only clears cached DNS entries.',
      });
    }

    if (goalLower.includes('wifi') || goalLower.includes('network') || goalLower.includes('internet') || goalLower.includes('connect')) {
      // Network/Wi-Fi issues
      actions.push({
        type: 'script_recommendation',
        id: 'script-wifi-toggle',
        title: 'Toggle Wi-Fi (macOS)',
        shell: 'bash',
        os: 'macos',
        script: 'networksetup -setairportpower en0 off; sleep 2; networksetup -setairportpower en0 on',
        explanation: 'Toggle Wi-Fi off and back on to reset the network interface and resolve connectivity issues.',
        dryRun: false,
        safetyNotes: 'Temporarily disconnects from Wi-Fi network for about 10 seconds.',
      });
    }

    if (goalLower.includes('cache') || goalLower.includes('slow') || goalLower.includes('performance')) {
      // Cache/storage issues
      actions.push({
        type: 'script_recommendation',
        id: 'script-clear-cache',
        title: 'Clear Application Cache (macOS)',
        shell: 'bash',
        os: 'macos',
        script: 'find ~/Library/Caches -name "*.cache" -type f -delete 2>/dev/null || true',
        explanation: 'Clear application cache files to free up disk space and improve performance.',
        dryRun: false,
        safetyNotes: 'Applications may rebuild caches on next launch. No user data is affected.',
      });
    }

    if (goalLower.includes('finder') || goalLower.includes('desktop') || goalLower.includes('files')) {
      // Finder/Desktop issues
      actions.push({
        type: 'script_recommendation',
        id: 'script-restart-finder',
        title: 'Restart Finder (macOS)',
        shell: 'bash',
        os: 'macos',
        script: 'killall Finder',
        explanation: 'Restart the Finder application to refresh the desktop and file views.',
        dryRun: false,
        safetyNotes: 'Temporarily closes all Finder windows. Safe operation.',
      });
    }

    // If no specific actions were matched, provide general troubleshooting
    if (actions.length === 0) {
      actions.push({
        type: 'open_url',
        id: 'open-help',
        title: 'Open macOS Support',
        url: 'https://support.apple.com/macos',
        target: '_blank',
        rationale: 'Access official Apple support documentation for your issue.',
        preview: 'Open Apple Support in new tab',
      });
    }

    // Always include a refresh action as a safe fallback
    if (actions.length < 3) {
      actions.push({
        type: 'dom_instruction',
        id: 'dom-refresh',
        title: 'Refresh Current Page',
        instruction: 'Click the refresh/reload button in your browser or use Cmd+R.',
        caution: 'This may clear any unsaved form data on the current page.',
      });
    }

    const summary = actions.length === 1
      ? `I can help you with that! Here's a safe automated solution for your ${goal} issue. Click "Approve" to proceed with the automated fix.`
      : `I found ${actions.length} safe solutions for your ${goal} issue. Review the options below and approve the ones you want to execute.`;

    return { summary, actions };
  },
});

export default automation;
