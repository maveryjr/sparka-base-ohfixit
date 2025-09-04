import 'server-only';

import { tool } from 'ai';
import { z } from 'zod';
import { GuidePlanSchema } from './guide-steps';
import { AutomationActionSchema, type AutomationAction, type AutomationPlan } from './automation';
import { logAction } from '@/lib/ohfixit/logger';
import { db } from '@/lib/db/client';
import { rollbackPoint } from '@/lib/db/schema';

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
    const dangerousPatterns = [
      /\breset\b/i,
      /\bdelete\b/i,
      /\buninstall\b/i,
      /\bflush\b/i,
      /\bclear\b/i,
      /\bfactory\b/i,
      /\bkill\b/i,
      /\bterminate\b/i,
      /\bremove\b/i,
    ];

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
          const inserted = await logAction({
            chatId: chatId ?? 'provisional',
            actionType: 'open_url',
            status: 'proposed',
            summary: `Open URL for step: ${step.title}`,
            payload: { stepId: step.id, url: a.url },
          }).catch(() => [] as any);

          // Heuristic: if the URL path contains 'reset' or similar, create a rollback stub
          try {
            const urlObj = new URL(a.url);
            const risky = dangerousPatterns.some((p) => p.test(urlObj.pathname + ' ' + urlObj.search));
            if (risky && inserted && inserted[0]?.id) {
              await db.insert(rollbackPoint).values({
                actionLogId: inserted[0].id,
                method: 'instruction-heuristic',
                data: {
                  reason: 'URL suggests risky reset/clear action',
                  url: a.url,
                  createdBy: 'guide-to-automation',
                } as any,
              });
            }
          } catch {}
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
        const inserted2 = await logAction({
          chatId: chatId ?? 'provisional',
          actionType: 'dom_instruction',
          status: 'proposed',
          summary: `Instruction for step: ${step.title}`,
          payload: { stepId: step.id, text: a.text },
        }).catch(() => [] as any);

        // Heuristic rollback stub for high-risk instruction verbs
        const matched = dangerousPatterns.filter((p) => p.test(a.text));
        if (matched.length && inserted2 && inserted2[0]?.id) {
          await db.insert(rollbackPoint).values({
            actionLogId: inserted2[0].id,
            method: 'instruction-heuristic',
            data: {
              reason: 'Instruction contains potentially risky operation',
              keywords: matched.map((r) => String(r)),
              original: a.text,
              createdBy: 'guide-to-automation',
            } as any,
          });
        }
      }
    }

    // Validate actions with the schema to ensure integrity
    const validated = z.array(AutomationActionSchema).parse(actions);
    const summary = plan.summary || 'Run the following steps automatically where feasible.';
    return { summary, actions: validated };
  },
});

export default guideToAutomation;
