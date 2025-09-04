import { z } from 'zod';
import { tool } from 'ai';
import { createModuleLogger } from '@/lib/logger';

const log = createModuleLogger('computer-use-tool');

export const computerUseSchema = z.object({
  task: z.string().describe('The task to perform using computer automation'),
  targetApplication: z.string().optional().describe('Specific application to target (optional)'),
  safetyCheck: z.boolean().default(true).describe('Whether to perform safety checks before execution'),
});

export const computerUse = tool({
  description: `Use computer to perform safe UI automation tasks. This tool provides computer use capabilities with safety checks and user approval required for each step.

Features:
- Safe UI automation with screenshot logging
- Planner → Executor architecture with per-step approvals
- Allowlist-based action validation
- Screenshot capture before/after operations
- Rollback capability for reversible actions

The tool will first analyze the request and create a safe execution plan, then require user approval before executing any steps.`,
  inputSchema: computerUseSchema,
  execute: async ({ task, targetApplication, safetyCheck }) => {
    log.info({ task, targetApplication, safetyCheck }, 'Computer use tool executed');

    try {
      // Create execution plan with safety checks
      const plan = await createExecutionPlan(task, targetApplication, safetyCheck);

      // Log the plan for audit trail
      await logExecutionPlan(plan);

      // Return plan for user approval
      return {
        plan,
        requiresApproval: true,
        message: 'Computer use plan created. Please review and approve the steps before execution.',
      };
    } catch (error) {
      log.error({ error }, 'Computer use tool execution failed');
      throw new Error(`Computer use failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

async function createExecutionPlan(task: string, targetApplication?: string, safetyCheck: boolean = true) {
  const { COMPUTER_USE_ALLOWLIST, ALLOWLIST_CONFIG } = await import('@/lib/ohfixit/computer-use-allowlist');

  // Analyze task and create safe execution plan
  const steps = await analyzeTaskForSteps(task, targetApplication, safetyCheck);

  // Validate all steps against allowlist
  const validatedSteps = steps.filter(step => {
    const actionDef = COMPUTER_USE_ALLOWLIST.find(action => action.id === step.action);
    return actionDef !== undefined;
  });

  const plan = {
    id: `plan_${Date.now()}`,
    task,
    targetApplication,
    safetyCheck,
    steps: validatedSteps,
    estimatedDuration: calculateEstimatedDuration(validatedSteps),
    rollbackAvailable: validatedSteps.some(step => step.rollbackStrategy !== undefined),
    createdAt: new Date().toISOString(),
  };

  return plan;
}

type PlanStep = {
  id: string;
  description: string;
  action: string;
  requiresApproval: boolean;
  risk: 'low' | 'medium' | 'high';
  rollbackStrategy?: 'none' | 'restore_previous_value' | 'restore_previous_selection';
};

async function analyzeTaskForSteps(task: string, targetApplication?: string, safetyCheck: boolean = true): Promise<PlanStep[]> {
  // This is a simplified implementation
  // In production, this would use AI to analyze the task and generate appropriate steps

  const steps: PlanStep[] = [
    {
      id: 'step_1',
      description: 'Take initial screenshot for audit trail',
      action: 'take_screenshot',
      requiresApproval: false,
      risk: 'low' as const,
    },
  ];

  // Add task-specific steps based on the task description
  if (task.toLowerCase().includes('click') || task.toLowerCase().includes('button')) {
    steps.push({
      id: 'step_2',
      description: `Click on the specified element for task: ${task}`,
      action: 'click_button',
      requiresApproval: safetyCheck,
      risk: 'low' as const,
      rollbackStrategy: 'none',
    });
  }

  if (task.toLowerCase().includes('type') || task.toLowerCase().includes('enter') || task.toLowerCase().includes('input')) {
    steps.push({
      id: 'step_3',
      description: `Enter text for task: ${task}`,
      action: 'type_text',
      requiresApproval: safetyCheck,
      risk: 'low' as const,
      rollbackStrategy: 'restore_previous_value',
    });
  }

  if (task.toLowerCase().includes('select') || task.toLowerCase().includes('choose')) {
    steps.push({
      id: 'step_4',
      description: `Select option for task: ${task}`,
      action: 'select_option',
      requiresApproval: safetyCheck,
      risk: 'low' as const,
      rollbackStrategy: 'restore_previous_selection',
    });
  }

  // Always add final screenshot
  steps.push({
    id: `step_${steps.length + 1}`,
    description: 'Take final screenshot for comparison',
    action: 'take_screenshot',
    requiresApproval: false,
    risk: 'low' as const,
  });

  return steps;
}

function calculateEstimatedDuration(steps: PlanStep[]): string {
  const baseTime = 30; // 30 seconds base
  const timePerStep = 15; // 15 seconds per step
  const totalSeconds = baseTime + (steps.length * timePerStep);

  if (totalSeconds < 60) {
    return `${totalSeconds} seconds`;
  } else if (totalSeconds < 300) {
    return `${Math.ceil(totalSeconds / 60)} minutes`;
  } else {
    return `${Math.ceil(totalSeconds / 60)}-${Math.ceil(totalSeconds / 60) + 1} minutes`;
  }
}

async function logExecutionPlan(plan: any) {
  // Log plan to audit trail
  log.info({ plan }, 'Execution plan created for computer use');
}
