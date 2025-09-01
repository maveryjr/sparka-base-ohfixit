import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const ActionOperation = z.enum(['preview', 'approve', 'execute', 'rollback']);

const actionRequestSchema = z.object({
  operation: ActionOperation,
  actionId: z.string(),
  parameters: z.record(z.any()).optional(),
  chatId: z.string().optional(),
  approvalId: z.string().optional(),
  sessionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { operation, actionId, parameters, chatId, approvalId } = actionRequestSchema.parse(body);

    if (operation === 'preview') {
      const preview = await generatePreview(actionId, parameters);
      return NextResponse.json({
        actionId,
        preview,
        approvable: true,
        riskLevel: preview.risks.length > 0 ? 'medium' : 'low',
      });
    }

    if (operation === 'approve') {
      const id = uuidv4();
      // TODO: persist approval with expiry, link to chatId/actionId
      return NextResponse.json({ approvalId: id, status: 'approved', actionId, chatId, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
    }

    if (operation === 'execute') {
      const jobId = uuidv4();
      // TODO: enqueue execution to desktop helper; create ActionLog entry with preview + pending outcome
      return NextResponse.json({ status: 'queued', jobId, actionId, approvalId: approvalId ?? null });
    }

    if (operation === 'rollback') {
      const jobId = uuidv4();
      // TODO: enqueue rollback via desktop helper, reference prior rollback point
      return NextResponse.json({ status: 'queued', jobId, rollbackOf: approvalId ?? actionId });
    }

    return NextResponse.json({ error: 'Unsupported operation' }, { status: 400 });
  } catch (err: any) {
    console.error('Automation action error:', err);
    const message = err?.message ?? 'Failed to process automation action';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function generatePreview(actionId: string, parameters: any): Promise<{
  description: string;
  commands: string[];
  risks: string[];
  reversible: boolean;
  estimatedTime: string;
  requirements: string[];
  previewDiff?: string;
}> {
  // Minimal mapping; align later with allowlist registry
  const definitions: Record<string, any> = {
    'flush-dns-macos': {
      description: 'Flush the DNS cache to resolve name resolution issues',
      commands: ['sudo dscacheutil -flushcache', 'sudo killall -HUP mDNSResponder'],
      risks: ['Temporary loss of cached DNS entries'],
      reversible: false,
      estimatedTime: '5 seconds',
      requirements: ['Administrator privileges'],
    },
    'toggle-wifi-macos': {
      description: 'Toggle Wi‑Fi off and back on to reset network interface',
      commands: ['networksetup -setairportpower en0 off', 'sleep 2', 'networksetup -setairportpower en0 on'],
      risks: ['Temporary loss of connectivity'],
      reversible: true,
      estimatedTime: '10–20 seconds',
      requirements: ['Administrator privileges'],
    },
    'clear-app-cache': {
      description: 'Move selected app cache to backup to free space and reset cache state',
      commands: ['mv ~/Library/Caches/com.example.app ~/Desktop/app-cache-backup-$(date +%s)'],
      risks: ['App may rebuild cache on next launch'],
      reversible: true,
      estimatedTime: '30–60 seconds',
      requirements: ['App not running'],
    },
  };

  const def = definitions[actionId];
  if (!def) throw new Error(`Unknown action: ${actionId}`);

  // Simple parameterization example
  if (actionId === 'clear-app-cache' && parameters?.bundleId) {
    def.commands = [`mv ~/Library/Caches/${parameters.bundleId} ~/Desktop/${parameters.bundleId}-cache-backup-$(date +%s)`];
  }

  return def;
}
