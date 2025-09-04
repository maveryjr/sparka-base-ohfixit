import 'server-only';

import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { humanHandoffSession } from '@/lib/db/schema';
import { generateUUID } from '@/lib/utils';

const Input = z.object({
  chatId: z.string(),
  reason: z.string().max(300).optional(),
});

export const startHandoff = tool({
  description: 'Creates a human handoff session for the given chat and returns a join link placeholder.',
  inputSchema: Input,
  execute: async ({ chatId, reason }) => {
    const id = generateUUID();
    const now = new Date();
    await db.insert(humanHandoffSession).values({
      id,
      chatId,
      userId: null as any,
      status: 'pending',
      operatorId: null as any,
      startedAt: now,
      transcriptRef: null as any,
      createdAt: now,
    } as any);
    return {
      id,
      chatId,
      status: 'pending',
      reason: reason || null,
      joinLink: `/support/hand-off/${id}`,
    };
  },
});

export default startHandoff;

