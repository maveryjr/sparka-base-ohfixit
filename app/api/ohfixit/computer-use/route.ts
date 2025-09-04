import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';
import { createModuleLogger } from '@/lib/logger';
import { getUserById } from '@/lib/db/queries';
import { COMPUTER_USE_ALLOWLIST } from '@/lib/ohfixit/computer-use-allowlist';

const log = createModuleLogger('api:ohfixit:computer-use');

const computerUseRequestSchema = z.object({
  action: z.string(),
  element: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  planId: z.string().optional(),
});

const computerUsePlanSchema = z.object({
  task: z.string(),
  targetApplication: z.string().optional(),
  safetyCheck: z.boolean().default(true),
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

    // Handle plan creation
    if (body.task) {
      const validatedData = computerUsePlanSchema.parse(body);
      return await handlePlanCreation(validatedData, session.user.id);
    }

    // Handle action execution
    const validatedData = computerUseRequestSchema.parse(body);
    return await handleActionExecution(validatedData, session.user.id);

  } catch (error) {
    log.error({ error }, 'Computer use API error');
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

async function handlePlanCreation(data: z.infer<typeof computerUsePlanSchema>, userId: string) {
  const { task, targetApplication, safetyCheck } = data;

  log.info({ task, targetApplication, safetyCheck, userId }, 'Creating computer use plan');

  // Create execution plan with safety checks
  const plan = await createExecutionPlan(task, targetApplication, safetyCheck);

  // Store plan in database for audit trail
  await storePlan(plan, userId);

  return NextResponse.json({
    success: true,
    plan,
    message: 'Computer use plan created successfully',
  });
}

async function handleActionExecution(data: z.infer<typeof computerUseRequestSchema>, userId: string) {
  const { action, element, parameters, planId } = data;

  log.info({ action, element, parameters, planId, userId }, 'Executing computer use action');

  // Validate action against allowlist
  if (!isActionAllowed(action)) {
    return NextResponse.json(
      { error: `Action '${action}' is not allowed` },
      { status: 403 }
    );
  }

  // Validate element if provided
  if (element && !isElementAllowed(action, element)) {
    return NextResponse.json(
      { error: `Element '${element}' is not allowed for action '${action}'` },
      { status: 403 }
    );
  }

  try {
    // Execute the action (placeholder implementation)
    const result = await executeAction(action, element, parameters);

    // Log the action for audit trail
    await logAction({
      action,
      element,
      parameters,
      result,
      userId,
      planId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      result,
      message: 'Action executed successfully',
    });
  } catch (error) {
    log.error({ error, action, element }, 'Action execution failed');

    // Log failed action
    await logAction({
      action,
      element,
      parameters,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      planId,
      timestamp: new Date().toISOString(),
      success: false,
    });

    return NextResponse.json(
      { error: 'Action execution failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper functions (placeholder implementations)
async function createExecutionPlan(task: string, targetApplication?: string, safetyCheck: boolean = true) {
  // This would integrate with the computer-use tool
  const plan = {
    id: `plan_${Date.now()}`,
    task,
    targetApplication,
    safetyCheck,
    steps: [
      {
        id: 'step_1',
        description: 'Take initial screenshot',
        action: 'take_screenshot',
        requiresApproval: false,
        risk: 'low',
      },
      {
        id: 'step_2',
        description: `Execute: ${task}`,
        action: 'ui_automation',
        requiresApproval: safetyCheck,
        risk: 'medium',
      },
      {
        id: 'step_3',
        description: 'Take final screenshot',
        action: 'take_screenshot',
        requiresApproval: false,
        risk: 'low',
      },
    ],
    estimatedDuration: '2-5 minutes',
    rollbackAvailable: true,
    createdAt: new Date().toISOString(),
  };

  return plan;
}

async function storePlan(plan: any, userId: string) {
  // Store plan in database for audit trail
  log.info({ plan, userId }, 'Storing execution plan');
}

function isActionAllowed(action: string): boolean {
  return COMPUTER_USE_ALLOWLIST.some(allowedAction => allowedAction.id === action);
}

function isElementAllowed(action: string, element: string): boolean {
  const actionDef = COMPUTER_USE_ALLOWLIST.find(a => a.id === action);
  if (!actionDef) return false;

  return actionDef.allowedElements.some(allowed =>
    element.includes(allowed) || allowed.includes(element)
  );
}

async function executeAction(action: string, element?: string, parameters?: Record<string, any>) {
  // This would interface with the Desktop Helper or browser automation
  log.info({ action, element, parameters }, 'Executing action');

  // Placeholder result
  return {
    action,
    element,
    parameters,
    status: 'completed',
    timestamp: new Date().toISOString(),
  };
}

async function logAction(actionData: any) {
  // Log action to audit trail
  log.info({ actionData }, 'Action logged to audit trail');
}
