import 'server-only';

import { tool } from 'ai';
import { z } from 'zod';
import { getAuditTimeline } from '@/lib/ohfixit/logger';

const Input = z.object({ chatId: z.string(), limit: z.number().min(1).max(200).default(50) });

export const getConsentLog = tool({
  description: 'Returns the consent and action audit timeline for a chat.',
  inputSchema: Input,
  execute: async ({ chatId, limit }) => {
    const events = await getAuditTimeline({ chatId, limit });
    return { events };
  },
});

export default getConsentLog;

