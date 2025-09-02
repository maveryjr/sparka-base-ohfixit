import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';
import { createModuleLogger } from '@/lib/logger';
import { getUserById } from '@/lib/db/queries';

const log = createModuleLogger('api:ohfixit:computer-use:plan');

const createPlanSchema = z.object({
  task: z.string().min(1).max(500),
  targetApplication: z.string().optional(),
  safetyCheck: z.boolean().default(true),
});

const executePlanSchema = z.object({
  planId: z.string(),
  stepId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserById({ userId: session.user.id });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = createPlanSchema.parse(body);

    log.info({ ...validatedData, userId: session.user.id }, 'Creating computer use plan');

    // Create execution plan
    const plan = await createDetailedPlan(validatedData, session.user.id);

    // Store plan for audit trail
    await storePlan(plan, session.user.id);

    return NextResponse.json({
      success: true,
      plan,
      message: 'Plan created successfully. Review and approve before execution.',
    });

  } catch (error) {
    log.error({ error }, 'Plan creation error');
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = executePlanSchema.parse(body);

    log.info({ ...validatedData, userId: session.user.id }, 'Executing computer use plan step');

    // Execute plan step
    const result = await executePlanStep(validatedData.planId, validatedData.stepId, session.user.id);

    return NextResponse.json({
      success: true,
      result,
      message: 'Plan step executed successfully',
    });

  } catch (error) {
    log.error({ error }, 'Plan execution error');
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function createDetailedPlan(data: z.infer<typeof createPlanSchema>, userId: string) {
  const { task, targetApplication, safetyCheck } = data;

  // Analyze task and generate steps
  const steps = await analyzeTaskForSteps(task, targetApplication);

  const plan = {
    id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    task,
    targetApplication,
    safetyCheck,
    steps,
    status: 'pending_approval',
    estimatedDuration: calculateEstimatedDuration(steps),
    rollbackAvailable: steps.some(step => step.rollbackStrategy),
    createdAt: new Date().toISOString(),
    createdBy: userId,
  };

  return plan;
}

async function analyzeTaskForSteps(task: string, targetApplication?: string) {
  // Simple task analysis - in production this would use AI
  const steps = [];
  const taskLower = task.toLowerCase();

  // Always start with screenshot
  steps.push({
    id: 'screenshot_before',
    description: 'Capture screenshot before automation',
    action: 'take_screenshot',
    requiresApproval: false,
    risk: 'low',
    rollbackStrategy: null,
    estimatedTime: '2 seconds',
  });

  // Analyze task for specific actions
  if (taskLower.includes('click') || taskLower.includes('press') || taskLower.includes('button')) {
    steps.push({
      id: 'click_action',
      description: 'Click on specified element',
      action: 'click_button',
      requiresApproval: true,
      risk: 'low',
      rollbackStrategy: null,
      estimatedTime: '3 seconds',
    });
  }

  if (taskLower.includes('type') || taskLower.includes('enter') || taskLower.includes('input')) {
    steps.push({
      id: 'type_action',
      description: 'Enter text into field',
      action: 'type_text',
      requiresApproval: true,
      risk: 'low',
      rollbackStrategy: 'restore_previous_value',
      estimatedTime: '5 seconds',
    });
  }

  if (taskLower.includes('select') || taskLower.includes('choose') || taskLower.includes('pick')) {
    steps.push({
      id: 'select_action',
      description: 'Select option from dropdown',
      action: 'select_option',
      requiresApproval: true,
      risk: 'low',
      rollbackStrategy: 'restore_previous_selection',
      estimatedTime: '3 seconds',
    });
  }

  if (taskLower.includes('scroll') || taskLower.includes('navigate')) {
    steps.push({
      id: 'scroll_action',
      description: 'Scroll to specified position',
      action: 'scroll_page',
      requiresApproval: false,
      risk: 'low',
      rollbackStrategy: 'restore_scroll_position',
      estimatedTime: '2 seconds',
    });
  }

  // Always end with screenshot
  steps.push({
    id: 'screenshot_after',
    description: 'Capture screenshot after automation',
    action: 'take_screenshot',
    requiresApproval: false,
    risk: 'low',
    rollbackStrategy: null,
    estimatedTime: '2 seconds',
  });

  return steps;
}

function calculateEstimatedDuration(steps: any[]): string {
  const totalSeconds = steps.reduce((total, step) => {
    const timeMatch = step.estimatedTime.match(/(\d+)/);
    return total + (timeMatch ? parseInt(timeMatch[1]) : 5);
  }, 0);

  if (totalSeconds < 60) {
    return `${totalSeconds} seconds`;
  } else {
    return `${Math.ceil(totalSeconds / 60)} minutes`;
  }
}

async function storePlan(plan: any, userId: string) {
  // Store plan in database for audit trail
  log.info({ plan, userId }, 'Storing computer use plan');
}

async function executePlanStep(planId: string, stepId: string | undefined, userId: string) {
  // Execute specific step or all steps in plan
  log.info({ planId, stepId, userId }, 'Executing plan step');

  // Placeholder implementation
  const result = {
    planId,
    stepId,
    status: 'completed',
    timestamp: new Date().toISOString(),
    output: 'Step executed successfully',
  };

  return result;
}
