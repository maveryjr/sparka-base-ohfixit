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
    'Proposes a safe, consent-gated action plan to resolve the user\'s issue. Actions include open_url, dom_instruction, and script_recommendation.',
  inputSchema: AutomationInputsSchema,
  execute: async ({ goal, contextHint }): Promise<AutomationPlan> => {
    // MVP scaffold: produce a conservative set of actions with clear previews
    const actions: AutomationAction[] = [
      {
        type: 'open_url',
        id: 'open-help',
        title: 'Open the official help/troubleshooting page',
        url: 'https://support.google.com/chrome/?hl=en#topic=7439538',
        target: '_blank',
        rationale:
          'Checking the official troubleshooting guide can quickly resolve common problems.',
        preview: 'Open help site in a new tab',
      },
      {
        type: 'dom_instruction',
        id: 'dom-refresh',
        title: 'Refresh the current page and clear temporary state',
        instruction:
          'Use the app\'s refresh or reload button. If issues persist, sign out and sign back in within the app UI.',
        caution:
          'Refreshing may clear unsaved inputs. Ensure you\'ve copied important text first.',
      },
      {
        type: 'script_recommendation',
        id: 'script-dns-flush',
        title: 'Flush DNS Cache (macOS)',
        shell: 'bash',
        os: 'macos',
        script: 'sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder',
        explanation:
          'Flush the DNS cache to resolve name resolution issues.',
        dryRun: false,
        safetyNotes: 'Requires administrator privileges.',
      },
      {
        type: 'script_recommendation',
        id: 'script-wifi-toggle',
        title: 'Toggle Wi-Fi (macOS)',
        shell: 'bash',
        os: 'macos',
        script: 'networksetup -setairportpower en0 off; sleep 2; networksetup -setairportpower en0 on',
        explanation:
          'Toggle Wi-Fi off and back on to reset the network interface.',
        dryRun: false,
        safetyNotes: 'Temporarily disconnects from Wi-Fi network.',
      },
      {
        type: 'script_recommendation',
        id: 'script-clear-cache',
        title: 'Clear Application Cache (macOS)',
        shell: 'bash',
        os: 'macos',
        script: 'find ~/Library/Caches -name "*.cache" -type f -delete 2>/dev/null || true',
        explanation:
          'Clear application cache files to free up disk space.',
        dryRun: false,
        safetyNotes: 'Applications may rebuild caches on next launch.',
      },
    ];

    const summary = `Automation plan for: ${goal}${contextHint ? ` (context: ${contextHint})` : ''}. Review the actions below. Nothing runs without your approval.`;

    return { summary, actions };
  },
});

export default automation;
