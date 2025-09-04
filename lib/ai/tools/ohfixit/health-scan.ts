import 'server-only';

import { tool } from 'ai';
import { z } from 'zod';

/**
 * healthScan tool
 *
 * Schedules a client-visible health scan job using the existing API routes:
 * - POST /api/ohfixit/health/run -> returns { jobId }
 * - GET  /api/ohfixit/health/results?jobId=... -> returns status/result
 *
 * This tool does not execute the checks directly (as many checks are client/browser-based).
 * It simply returns the chatId and optional requested checks so the UI can post the job
 * and poll for results.
 */

export const HealthScanInput = z.object({
  checks: z.array(z.string()).optional().describe('Optional list of check IDs to run'),
});

export type HealthScanInput = z.infer<typeof HealthScanInput>;

export const HealthScanOutputSchema = z.object({
  chatId: z.string().nullable(),
  requestedAt: z.string(),
  checks: z.array(z.string()).optional(),
});

export type HealthScanOutput = z.infer<typeof HealthScanOutputSchema>;

export const healthScan = tool({
  description:
    'Schedules a local device health scan (disk, network, security, performance, browser) and returns context for the UI to run and display results.',
  inputSchema: HealthScanInput,
  execute: async ({ checks }): Promise<HealthScanOutput> => {
    // We do not directly call the API here to avoid auth/session coupling; the UI will do it.
    return {
      chatId: null,
      requestedAt: new Date().toISOString(),
      checks,
    };
  },
});

export default healthScan;

