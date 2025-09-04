import 'server-only';

import { tool } from 'ai';
import { z } from 'zod';
import type { ModelMessage, FileUIPart } from 'ai';
import type { Session } from 'next-auth';
import type { ModelId } from '@/lib/ai/model-id';
import type { StreamWriter } from '../../types';
import { generateObject, streamObject } from 'ai';
import { getLanguageModel } from '@/lib/ai/providers';
import buildDiagnosticsContext from '@/lib/ohfixit/diagnostics-context';

// Schema for a single guide step
export const GuideStepSchema = z.object({
  id: z.string().describe('Stable id for the step'),
  title: z.string().min(3).max(120).describe('Short user-facing title'),
  rationale: z
    .string()
    .min(3)
    .max(400)
    .describe('Why this step is recommended in plain language'),
  actions: z
    .array(
      z.object({
        kind: z
          .enum(['instruction', 'open_url', 'check_setting'])
          .describe('Action type to suggest to the user'),
        text: z
          .string()
          .min(1)
          .max(400)
          .describe('Concrete instruction users can follow'),
        url: z.string().url().optional().describe('URL to open if applicable'),
      }),
    )
    .min(1)
    .max(10)
    .describe('One or more concrete actions that the user can try'),
  fallback: z
    .string()
    .min(3)
    .max(200)
    .optional()
    .describe('What to try next if this step did not work'),
});

export type GuideStep = z.infer<typeof GuideStepSchema>;

export const GuidePlanSchema = z.object({
  summary: z
    .string()
    .min(3)
    .max(300)
    .describe('High-level summary of the plan in user-friendly terms'),
  steps: z.array(GuideStepSchema).min(1).max(12),
});

export type GuidePlan = z.infer<typeof GuidePlanSchema>;

// Enhanced inputs to the tool with AI analysis capabilities
export const GuideInputsSchema = z.object({
  goal: z
    .string()
    .min(3)
    .max(300)
    .describe('User goal/problem statement extracted from conversation'),
  contextHint: z
    .string()
    .max(500)
    .optional()
    .describe('Optional context like OS/app or recent screenshot description'),
  attachments: z
    .array(z.any())
    .optional()
    .describe('Screenshots and files attached to the message'),
  diagnosticsContext: z
    .string()
    .optional()
    .describe('System diagnostics and client information'),
  conversationContext: z
    .array(z.any())
    .optional()
    .describe('Previous messages and context for better understanding'),
});

export type GuideInputs = z.infer<typeof GuideInputsSchema>;

// Utility: create slug-like id if the model omits ids or produces unstable ones
function toId(input: string, index: number): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48);
  const safe = base || `step-${index + 1}`;
  return safe;
}

function normalizePlan(plan: GuidePlan): GuidePlan {
  const seen = new Set<string>();
  const steps = plan.steps.map((s, i) => {
    let id = (s.id || '').trim();
    if (!id) id = toId(s.title, i);
    // ensure unique ids
    let unique = id;
    let n = 2;
    while (seen.has(unique)) {
      unique = `${id}-${n++}`;
    }
    seen.add(unique);
    // clamp action kinds and ensure minimal text
    const actions = s.actions.map(a => ({
      kind: a.kind as 'instruction' | 'open_url' | 'check_setting',
      text: a.text,
      url: a.url,
    }));
    return { ...s, id: unique, actions };
  });
  return { ...plan, steps };
}

function buildGuidePlanPrompt({
  goal,
  contextHint,
  diagnosticsContext,
  attachments,
  conversationContext,
}: {
  goal: string;
  contextHint?: string;
  diagnosticsContext?: string;
  attachments?: FileUIPart[];
  conversationContext?: ModelMessage[];
}): string {
  const attList = attachments
    ?.map((att) => `${att.type}${att.filename ? `:${att.filename}` : ''}`)
    .slice(0, 8)
    .join(', ');
  const convoTail = conversationContext
    ?.slice(-3)
    .map((m) => `${m.role}: ${typeof m.content === 'string' ? m.content : ''}`)
    .join('\n');

  return [
    'You are an expert support engineer and create concise, actionable troubleshooting guides.',
    'Construct a step-by-step plan tailored to the user, with short titles, clear rationales, and concrete actions.',
    'Rules:',
    '- Do NOT assume a pre-defined issue catalog; infer from the goal/context only.',
    '- Only output JSON that conforms strictly to the provided schema.',
    '- Each step must include 1-10 actions; prefer 2-5.',
    '- Actions should be specific, safe, and reversible when possible.',
    '- Use open_url only when a clear, authoritative link adds value.',
    '',
    `User goal: ${goal}`,
    contextHint ? `Context: ${contextHint}` : '',
    diagnosticsContext ? `Diagnostics (may be truncated):\n${diagnosticsContext.slice(0, 1000)}` : '',
    attList ? `Attachments: ${attList}` : '',
    convoTail ? `Recent conversation:\n${convoTail}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// Factory function that creates the guideSteps tool with AI analysis capabilities
export function createGuideSteps({
  session,
  dataStream,
  messageId,
  selectedModel,
  attachments,
  contextForLLM,
  chatId,
}: {
  session: Session;
  dataStream: StreamWriter;
  messageId: string;
  selectedModel: ModelId;
  attachments: FileUIPart[];
  contextForLLM: ModelMessage[];
  chatId: string;
}) {
  return tool({
    description:
      'Returns a step-by-step guide (summary + steps) to help the user resolve their specific issue by analyzing screenshots, diagnostics data, and system context using AI.',
    inputSchema: GuideInputsSchema,
    execute: async ({ goal, contextHint, attachments: inputAttachments }): Promise<GuidePlan> => {
      // Get diagnostics context for the current session
      const diagnosticsContext = await buildDiagnosticsContext({
        userId: session?.user?.id || null,
        anonymousId: (session as any)?.anonymousId || null,
        chatId,
      });

      const prompt = buildGuidePlanPrompt({
        goal,
        contextHint,
        diagnosticsContext: diagnosticsContext || undefined,
        attachments: inputAttachments || attachments,
        conversationContext: contextForLLM,
      });

      try {
        const { partialObjectStream, object } = streamObject({
          model: getLanguageModel(selectedModel),
          schema: GuidePlanSchema,
          prompt,
        });

        // Stream partial updates to the UI
        for await (const partialObject of partialObjectStream) {
          dataStream.write({
            type: 'data-guidePlanPartial',
            data: partialObject,
          });
        }

        // Wait for the final object and normalize it
        const finalObject = await object;
        return normalizePlan(finalObject);
      } catch (err) {
        console.error('guide-steps dynamic generation failed; using fallback', err);
        // Minimal safe fallback
        const fallback: GuidePlan = {
          summary: 'A short, safe plan to clarify the problem and attempt basic remediation.',
          steps: [
            {
              id: 'clarify-scope',
              title: 'Clarify scope and prerequisites',
              rationale: 'Ensuring context and prerequisites avoids chasing secondary symptoms.',
              actions: [
                { kind: 'instruction', text: 'Re-state the exact goal and where it fails (screen, action, or error message).'},
                { kind: 'instruction', text: 'Confirm you have required access/permissions and a stable internet connection.'},
              ],
              fallback: 'Capture a screenshot of the failure and proceed.'
            },
            {
              id: 'retry-clean-slate',
              title: 'Retry from a clean slate',
              rationale: 'A clean retry isolates transient or cache-related issues.',
              actions: [
                { kind: 'instruction', text: 'Fully close and relaunch the affected app or page; then retry the action.'},
                { kind: 'instruction', text: 'If applicable, sign out and back in; then retry.'},
              ],
              fallback: 'If issue persists, capture any error text for the next step.'
            },
            {
              id: 'collect-evidence',
              title: 'Collect details for targeted troubleshooting',
              rationale: 'Specific error details enable precise next steps.',
              actions: [
                { kind: 'instruction', text: 'Copy any exact error messages or codes displayed.'},
                { kind: 'instruction', text: 'Capture a screenshot or short screen recording of the issue.'},
              ],
              fallback: 'Share the captured details to get precise follow-ups.'
            },
          ],
        };
        return fallback;
      }
    },
  });
}

// Legacy export for backward compatibility (will be removed)
export const guideSteps = createGuideSteps({
  session: {} as any,
  dataStream: {} as any,
  messageId: '',
  selectedModel: 'gpt-4o' as ModelId,
  attachments: [],
  contextForLLM: [],
  chatId: '',
});

export default guideSteps;
