import 'server-only';

import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { actionArtifact, actionLog } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

const Input = z.object({
  chatId: z.string().optional(),
  actionLogId: z.string().optional(),
  limit: z.number().min(1).max(100).default(25),
});

export const getActionArtifacts = tool({
  description: 'Fetches action artifacts (screenshots/logs/diffs) for a chat or a specific action.',
  inputSchema: Input,
  execute: async ({ chatId, actionLogId, limit }) => {
    if (!chatId && !actionLogId) {
      return { error: 'chatId or actionLogId required' };
    }

    if (actionLogId) {
      const rows = await db
        .select()
        .from(actionArtifact)
        .where(eq(actionArtifact.actionLogId, actionLogId))
        .orderBy(desc(actionArtifact.createdAt))
        .limit(limit);
      return { artifacts: rows };
    }

    const rows = await db
      .select({
        id: actionArtifact.id,
        actionLogId: actionArtifact.actionLogId,
        type: actionArtifact.type,
        uri: actionArtifact.uri,
        hash: actionArtifact.hash,
        createdAt: actionArtifact.createdAt,
      })
      .from(actionArtifact)
      .innerJoin(actionLog, eq(actionArtifact.actionLogId, actionLog.id))
      .where(eq(actionLog.chatId, chatId!))
      .orderBy(desc(actionArtifact.createdAt))
      .limit(limit);

    return { artifacts: rows };
  },
});

export default getActionArtifacts;

