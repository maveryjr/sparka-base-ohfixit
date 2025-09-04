import 'server-only';

import { tool } from 'ai';
import { z } from 'zod';
import { GuidePlanSchema } from './guide-steps';
import { AutomationActionSchema, type AutomationAction, type AutomationPlan } from './automation';
import { logAction } from '@/lib/ohfixit/logger';

const GuideToAutomationInput = z.object({
  chatId: z.string().optional(),
  plan: GuidePlanSchema,
});

export type GuideToAutomationInput = z.infer<typeof GuideToAutomationInput>;

export const guideToAutomation = tool({
  description:
    'Converts a step-by-step troubleshooting guide into an executable automation plan. Logs proposed actions for approval.',
  inputSchema: GuideToAutomationInput,
  execute: async ({ chatId, plan }): Promise<AutomationPlan> => {
    const actions: AutomationAction[] = [];

    for (const step of plan.steps) {
      for (const a of step.actions) {
        if (a.kind === 'open_url' && a.url) {
          actions.push({
            type: 'open_url',
            id: `open-${step.id}`,
            title: step.title,
            url: a.url,
            target: '_blank',
            rationale: step.rationale?.slice(0, 280),
            preview: a.text?.slice(0, 280),
          });
          await logAction({
            chatId: chatId ?? 'provisional',
            actionType: 'open_url',
            status: 'proposed',
            summary: `Open URL for step: ${step.title}`,
            payload: { stepId: step.id, url: a.url },
          }).catch(() => {});
          continue;
        }

        // Map generic instructions/checks to DOM instructions (non-executing, user-guided)
        actions.push({
          type: 'dom_instruction',
          id: `instr-${step.id}`,
          title: step.title,
          instruction: a.text.slice(0, 500),
          caution: step.fallback?.slice(0, 280),
        });
        await logAction({
          chatId: chatId ?? 'provisional',
          actionType: 'dom_instruction',
          status: 'proposed',
          summary: `Instruction for step: ${step.title}`,
          payload: { stepId: step.id, text: a.text },
        }).catch(() => {});
      }
    }

    // Validate actions with the schema to ensure integrity
    const validated = z.array(AutomationActionSchema).parse(actions);
    const summary = plan.summary || 'Run the following steps automatically where feasible.';
    return { summary, actions: validated };
  },
});

export default guideToAutomation;

