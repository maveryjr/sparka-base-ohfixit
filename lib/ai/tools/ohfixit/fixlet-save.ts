import 'server-only';

import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { fixlet, fixletStep } from '@/lib/db/schema';
import { generateUUID } from '@/lib/utils';

const Input = z.object({
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

export const saveFixlet = tool({
  description: 'Saves a troubleshooting plan as a reusable Fixlet with steps.',
  inputSchema: Input,
  execute: async ({ title, description, category, difficulty, estimatedTime, tags, steps }) => {
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
  },
});

export default saveFixlet;

