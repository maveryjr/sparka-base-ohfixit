import 'server-only';

import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { fixlet, fixletStep } from '@/lib/db/schema';
import { GuidePlanSchema } from './guide-steps';
import { AutomationPlanSchema } from './automation';
import { generateUUID } from '@/lib/utils';

const DirectInput = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.string().min(2),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('easy'),
  estimatedTime: z.string().default('5-15 minutes'),
  tags: z.array(z.string()).optional(),
  steps: z.array(z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    actions: z.array(z.string()).default([]),
    expectedResult: z.string().optional(),
    estimatedTime: z.string().default('1-5 minutes'),
    category: z.string().default('General'),
    os: z.string().optional(),
    successCriteria: z.array(z.string()).optional(),
  })).min(1),
});

const FromGuideInput = z.object({
  from: z.literal('guide'),
  plan: GuidePlanSchema,
});

const FromAutomationInput = z.object({
  from: z.literal('automation'),
  plan: AutomationPlanSchema,
});

const TextInput = z.object({ text: z.string() });

// Wrap the union in an object to ensure it's always type "object"
const Input = z.object({
  data: z.union([DirectInput, FromGuideInput, FromAutomationInput, TextInput])
});

type SaveFixletInput = z.infer<typeof Input>;

async function executeSaveFixlet(input: SaveFixletInput) {
  const actualInput = input.data;
    let title: string;
    let description: string | undefined;
    let category: string;
    let difficulty: 'easy'|'medium'|'hard' = 'easy';
    let estimatedTime: string = '5-15 minutes';
    let tags: string[] | undefined;
    let steps: Array<{ title: string; description?: string; actions: string[]; expectedResult?: string; estimatedTime: string; category: string; os?: string; successCriteria?: string[]; }> = [];

    if ('text' in actualInput) {
      try {
        const match = actualInput.text.match(/\{[\s\S]*\}$/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed && parsed.from && parsed.plan) {
            // Recurse by calling handler with structured input
            return await executeSaveFixlet({ data: parsed } as SaveFixletInput);
          }
        }
      } catch {}
      throw new Error('Could not parse fixlet input from text');
    } else if ('from' in actualInput && actualInput.from === 'guide') {
      const plan = actualInput.plan;
      title = plan.summary.slice(0, 60) || 'Guide Fixlet';
      description = 'Saved from Guide Plan';
      category = 'System';
      steps = plan.steps.map((s) => ({
        title: s.title,
        description: s.rationale,
        actions: s.actions.map((a) => (a.text || '').trim()).filter(Boolean),
        estimatedTime: '1-5 minutes',
        category: 'General',
      }));
    } else if ('from' in actualInput && actualInput.from === 'automation') {
      const plan = actualInput.plan;
      title = plan.summary.slice(0, 60) || 'Automation Fixlet';
      description = 'Saved from Automation Plan';
      category = 'System';
      steps = plan.actions.map((a) => {
        let actions: string[] = [];
        if (a.type === 'open_url' && a.url) actions = [`Open URL: ${a.url}`];
        if (a.type === 'dom_instruction' && a.instruction) actions = [a.instruction];
        if (a.type === 'script_recommendation' && a.script) actions = [a.script];
        const desc = a.type === 'script_recommendation' ? a.explanation : (a as any).caution || (a as any).rationale || (a as any).preview;
        return {
          title: a.title,
          description: desc || undefined,
          actions,
          estimatedTime: '1-5 minutes',
          category: 'General',
        };
      });
    } else {
      ({ title, description, category, difficulty = 'easy', estimatedTime = '5-15 minutes', tags, steps } = actualInput as any);
    }

    const fixletId = generateUUID();
    const now = new Date();
    await db.insert(fixlet).values({
      id: fixletId,
      title,
      description: description || null,
      category,
      difficulty,
      estimatedTime,
      tags: tags || [],
      authorId: '00000000-0000-0000-0000-000000000000', // placeholder; hook to session later
      isPublic: false,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    } as any);

    let order = 0;
    for (const s of steps) {
      await db.insert(fixletStep).values({
        id: generateUUID(),
        fixletId,
        title: s.title,
        description: s.description || null,
        actions: s.actions,
        expectedResult: s.expectedResult || null,
        estimatedTime: s.estimatedTime,
        category: s.category,
        os: s.os || null,
        successCriteria: s.successCriteria || [],
        stepOrder: order++,
        createdAt: now,
      } as any);
    }

  return { ok: true, fixletId };
}

export const saveFixlet = tool({
  description: 'Saves a troubleshooting plan as a reusable Fixlet with steps.',
  inputSchema: Input,
  execute: executeSaveFixlet,
});

export default saveFixlet;
