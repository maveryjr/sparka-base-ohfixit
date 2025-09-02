import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { fixlet, fixletStep, fixletExecution, fixletExecutionStep } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const startExecutionSchema = z.object({
  chatId: z.string().optional(),
});

const updateExecutionStepSchema = z.object({
  stepId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  notes: z.string().optional(),
  artifacts: z.any().optional(),
});

// POST /api/ohfixit/fixlet/[id]/execute - Start executing a fixlet
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fixletId = params.id;
    const body = await request.json();
    const { chatId } = startExecutionSchema.parse(body);

    // Verify fixlet exists and user has access
    const fixlets = await db
      .select()
      .from(fixlet)
      .where(eq(fixlet.id, fixletId))
      .limit(1);

    if (fixlets.length === 0) {
      return NextResponse.json({ error: 'Fixlet not found' }, { status: 404 });
    }

    const fixletData = fixlets[0];
    if (fixletData.authorId !== session.user.id && !fixletData.isPublic) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all steps for this fixlet
    const steps = await db
      .select()
      .from(fixletStep)
      .where(eq(fixletStep.fixletId, fixletId))
      .orderBy(fixletStep.stepOrder);

    // Create execution record
    const [execution] = await db
      .insert(fixletExecution)
      .values({
        fixletId,
        userId: session.user.id,
        chatId: chatId || null,
        status: 'running',
        startedAt: new Date(),
      })
      .returning();

    // Create execution step records for all steps
    const executionSteps = steps.map(step => ({
      executionId: execution.id,
      stepId: step.id,
      status: 'pending' as const,
    }));

    await db.insert(fixletExecutionStep).values(executionSteps);

    // Increment usage count
    await db
      .update(fixlet)
      .set({ usageCount: sql`${fixlet.usageCount} + 1` })
      .where(eq(fixlet.id, fixletId));

    // Get the complete execution with steps
    const completeExecution = await db
      .select({
        execution: fixletExecution,
        step: fixletStep,
        executionStep: fixletExecutionStep,
      })
      .from(fixletExecution)
      .innerJoin(fixletExecutionStep, eq(fixletExecution.id, fixletExecutionStep.executionId))
      .innerJoin(fixletStep, eq(fixletExecutionStep.stepId, fixletStep.id))
      .where(eq(fixletExecution.id, execution.id))
      .orderBy(fixletStep.stepOrder);

    return NextResponse.json({
      execution: completeExecution[0].execution,
      steps: completeExecution.map(row => ({
        ...row.step,
        executionStatus: row.executionStep.status,
        executionId: row.executionStep.id,
        executionNotes: row.executionStep.notes,
        executionArtifacts: row.executionStep.artifacts,
      })),
    });

  } catch (error) {
    console.error('Error starting fixlet execution:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/ohfixit/fixlet/[id]/execute/[executionId] - Update execution step
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; executionId?: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fixletId = params.id;
    const executionId = params.executionId || new URL(request.url).searchParams.get('executionId');

    if (!executionId) {
      return NextResponse.json({ error: 'Execution ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { stepId, status, notes, artifacts } = updateExecutionStepSchema.parse(body);

    // Verify execution belongs to user
    const executions = await db
      .select()
      .from(fixletExecution)
      .where(and(
        eq(fixletExecution.id, executionId),
        eq(fixletExecution.userId, session.user.id)
      ))
      .limit(1);

    if (executions.length === 0) {
      return NextResponse.json({ error: 'Execution not found or access denied' }, { status: 404 });
    }

    const execution = executions[0];

    // Update the execution step
    const updateData: any = {
      status,
    };

    if (status === 'running') {
      updateData.startedAt = new Date();
    } else if (['completed', 'failed', 'skipped'].includes(status)) {
      updateData.completedAt = new Date();
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (artifacts !== undefined) {
      updateData.artifacts = artifacts;
    }

    await db
      .update(fixletExecutionStep)
      .set(updateData)
      .where(and(
        eq(fixletExecutionStep.executionId, executionId),
        eq(fixletExecutionStep.stepId, stepId)
      ));

    // Check if all steps are completed
    const allSteps = await db
      .select()
      .from(fixletExecutionStep)
      .where(eq(fixletExecutionStep.executionId, executionId));

    const completedSteps = allSteps.filter(step =>
      ['completed', 'skipped'].includes(step.status)
    );
    const failedSteps = allSteps.filter(step => step.status === 'failed');

    // Update execution status
    let executionStatus = execution.status;
    if (completedSteps.length === allSteps.length) {
      executionStatus = 'completed';
    } else if (failedSteps.length > 0) {
      executionStatus = 'failed';
    }

    const executionUpdate: any = { status: executionStatus };
    if (executionStatus === 'completed' || executionStatus === 'failed') {
      executionUpdate.completedAt = new Date();
    }

    await db
      .update(fixletExecution)
      .set(executionUpdate)
      .where(eq(fixletExecution.id, executionId));

    return NextResponse.json({
      success: true,
      executionStatus,
      stepStatus: status,
    });

  } catch (error) {
    console.error('Error updating fixlet execution:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/ohfixit/fixlet/[id]/execute/[executionId] - Get execution status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; executionId?: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fixletId = params.id;
    const executionId = params.executionId || new URL(request.url).searchParams.get('executionId');

    if (!executionId) {
      return NextResponse.json({ error: 'Execution ID required' }, { status: 400 });
    }

    // Get execution with steps
    const executionData = await db
      .select({
        execution: fixletExecution,
        step: fixletStep,
        executionStep: fixletExecutionStep,
      })
      .from(fixletExecution)
      .innerJoin(fixletExecutionStep, eq(fixletExecution.id, fixletExecutionStep.executionId))
      .innerJoin(fixletStep, eq(fixletExecutionStep.stepId, fixletStep.id))
      .where(and(
        eq(fixletExecution.id, executionId),
        eq(fixletExecution.userId, session.user.id)
      ))
      .orderBy(fixletStep.stepOrder);

    if (executionData.length === 0) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    const execution = executionData[0].execution;
    const steps = executionData.map(row => ({
      ...row.step,
      executionStatus: row.executionStep.status,
      executionId: row.executionStep.id,
      executionNotes: row.executionStep.notes,
      executionArtifacts: row.executionStep.artifacts,
      startedAt: row.executionStep.startedAt,
      completedAt: row.executionStep.completedAt,
    }));

    return NextResponse.json({
      execution,
      steps,
    });

  } catch (error) {
    console.error('Error fetching fixlet execution:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
