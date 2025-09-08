import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logAction } from '@/lib/ohfixit/logger';
import { healthCheckEngine, type HealthCheckSummary } from '@/lib/ohfixit/health-check-engine';
import { db } from '@/lib/db/client';
import { healthCheck } from '@/lib/db/schema';

// Enhanced in-memory job store for health checks
const g = globalThis as any;
g.__ohfixit_health_jobs = g.__ohfixit_health_jobs || new Map<string, { 
  status: 'queued' | 'running' | 'completed' | 'failed'; 
  createdAt: number; 
  result?: HealthCheckSummary; 
  checks?: string[];
  userId?: string;
  chatId?: string;
}>();

const runSchema = z.object({
  chatId: z.string().optional(),
  checks: z.array(z.string()).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
});

// Map generic category names to specific check IDs
const categoryToCheckIds: Record<string, string[]> = {
  'disk': ['disk-space', 'temp-files'],
  'network': ['network-connectivity', 'dns-health'],
  'security': ['antivirus-status', 'firewall-status'],
  'performance': ['memory-usage', 'startup-programs'],
  'browser': ['default-browser', 'browser-extensions'],
  'system': ['system-updates', 'time-sync']
};

function expandCheckIds(checks: string[]): string[] {
  const expandedChecks = new Set<string>();
  
  for (const check of checks) {
    if (categoryToCheckIds[check]) {
      // If it's a category, add all checks in that category
      categoryToCheckIds[check].forEach(id => expandedChecks.add(id));
    } else {
      // If it's already a specific check ID, add it directly
      expandedChecks.add(check);
    }
  }
  
  return Array.from(expandedChecks);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chatId, checks, priority } = runSchema.parse(body);

    // Expand generic category names to specific check IDs
    const expandedChecks = checks ? expandCheckIds(checks) : [];

    const jobId = uuidv4();
    const userId = session.user.id;
    
    // Enqueue real health check job
    g.__ohfixit_health_jobs.set(jobId, { 
      status: 'queued', 
      createdAt: Date.now(),
      checks: expandedChecks,
      userId,
      chatId: chatId || undefined
    });

    // Run health checks asynchronously
    setTimeout(async () => {
      const job = g.__ohfixit_health_jobs.get(jobId);
      if (!job) return;
      
      try {
        job.status = 'running';
        g.__ohfixit_health_jobs.set(jobId, job);
        
        let result: HealthCheckSummary;
        if (job.checks && job.checks.length > 0) {
          // Run specific checks
          const checkPromises = job.checks.map((checkId: string) => 
            healthCheckEngine.runSingleCheck(checkId).catch(error => {
              console.error(`Health check ${checkId} failed:`, error);
              return null;
            })
          );
          
          const checkResults = await Promise.all(checkPromises);
          const validResults = checkResults.filter(r => r !== null);
          
          // Create a partial summary with just the requested checks
          result = {
            overallScore: validResults.length ? Math.round(validResults.reduce((sum, r) => sum + r!.score, 0) / validResults.length) : 0,
            overallStatus: validResults.some(r => r!.status === 'critical') ? 'critical' : 
                          validResults.some(r => r!.status === 'warning') ? 'warning' : 'healthy',
            totalChecks: validResults.length,
            healthyCount: validResults.filter(r => r!.status === 'healthy').length,
            warningCount: validResults.filter(r => r!.status === 'warning').length,
            criticalCount: validResults.filter(r => r!.status === 'critical').length,
            checks: validResults as any,
            systemInfo: await (healthCheckEngine as any).gatherSystemInfo(),
            lastRunTime: new Date(),
            nextRecommendedCheck: new Date(Date.now() + 24 * 60 * 60 * 1000)
          };
        } else {
          // Run all checks
          result = await healthCheckEngine.runAllChecks();
        }
        
        job.status = 'completed';
        job.result = result;
        g.__ohfixit_health_jobs.set(jobId, job);
        
        // Store health check results in database
        try {
          await Promise.all(
            result.checks.map(check => 
              db.insert(healthCheck).values({
                chatId: chatId || null,
                userId,
                checkKey: check.id,
                status: check.status,
                score: check.score,
                details: {
                  message: check.message,
                  details: check.details,
                  recommendation: check.recommendation,
                  category: check.category,
                  fixable: check.fixable,
                  estimatedFixTime: check.estimatedFixTime,
                }
              }).onConflictDoNothing()
            )
          );
        } catch (error) {
          console.error('Failed to store health check results:', error);
        }

        // Log successful completion
        await logAction({
          chatId: chatId ?? 'provisional',
          actionType: 'script_recommendation',
          status: 'executed',
          summary: `Health checks completed (Score: ${result.overallScore})`,
          payload: { 
            jobId, 
            overallScore: result.overallScore,
            overallStatus: result.overallStatus,
            totalChecks: result.totalChecks 
          },
        }).catch(() => {});
        
      } catch (error) {
        console.error('Health check execution failed:', error);
        job.status = 'failed';
        g.__ohfixit_health_jobs.set(jobId, job);
        
        // Log failure
        await logAction({
          chatId: chatId ?? 'provisional',
          actionType: 'script_recommendation',
          status: 'cancelled',
          summary: 'Health checks failed',
          payload: { jobId, error: error instanceof Error ? error.message : 'Unknown error' },
        }).catch(() => {});
      }
    }, 100);

    // Log action to audit timeline
    await logAction({
      chatId: chatId ?? 'provisional',
      actionType: 'script_recommendation',
      status: 'proposed',
      summary: 'Health checks scheduled',
      payload: { jobId, checks: checks ?? null, priority: priority ?? 'normal' },
    }).catch(() => {});

    return NextResponse.json({
      jobId,
      status: 'queued',
      acceptedChecks: expandedChecks.length > 0 ? expandedChecks : ['disk-space', 'network-connectivity', 'dns-health', 'startup-programs'],
      priority: priority ?? 'normal',
      estimatedTime: '30–90 seconds',
      chatId: chatId ?? null,
    });
  } catch (err: any) {
    console.error('Health run error:', err);
    return NextResponse.json({ error: err?.message ?? 'Failed to schedule health checks' }, { status: 400 });
  }
}
