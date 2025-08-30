'use server';

import { tool, type Tool } from 'ai';
import { z } from 'zod';

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

// Inputs to the tool: can include an optional goal or brief from the conversation
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
});

export type GuideInputs = z.infer<typeof GuideInputsSchema>;

// Server-side tool that returns a structured GuidePlan. For MVP, the execute function
// can synthesize a reasonable plan from the provided inputs and recent messages.
export const guideSteps: Tool<GuideInputs, GuidePlan> = tool({
  description:
    'Returns a step-by-step guide (summary + steps) to help the user resolve their issue.',
  inputSchema: GuideInputsSchema,
  execute: async ({ goal, contextHint }): Promise<GuidePlan> => {
    // MVP placeholder implementation: create a simple plan scaffold that models can learn to refine.
    // In future, this can incorporate diagnostics and screenshot metadata.
    const steps: GuideStep[] = [
      {
        id: 'step-1',
        title: 'Verify the basics',
        rationale:
          'Simple checks often resolve common issues quickly before deeper steps are needed.',
        actions: [
          {
            kind: 'instruction',
            text: 'Restart the affected app and try the action again.',
          },
          {
            kind: 'instruction',
            text: 'Ensure your internet connection is stable (try a speed test).',
          },
        ],
        fallback: 'If the issue persists, proceed to the next step.',
      },
      {
        id: 'step-2',
        title: 'Check for updates',
        rationale:
          'Updates can contain compatibility and bug fixes that resolve many issues.',
        actions: [
          {
            kind: 'instruction',
            text: 'Update the app to the latest version from the official source.',
          },
          {
            kind: 'open_url',
            text: 'Open the official status page to check for outages.',
            url: 'https://status.azure.com/',
          },
        ],
        fallback: 'If the issue remains, try the next step.',
      },
      {
        id: 'step-3',
        title: 'Collect details and retry',
        rationale:
          'Gathering specific error messages or screenshots can help to pinpoint the cause.',
        actions: [
          {
            kind: 'instruction',
            text: 'Take a screenshot of the error and share it here for review.',
          },
          {
            kind: 'instruction',
            text: 'Note any error codes or timestamps when the issue occurs.',
          },
        ],
      },
    ];

    const summary = `Guide for: ${goal}${contextHint ? ` (context: ${contextHint})` : ''}. Follow the steps and let me know what happens at each stage.`;

    return { summary, steps };
  },
});

export default guideSteps;
