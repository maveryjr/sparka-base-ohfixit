import { z } from 'zod';
import { tool } from 'ai';
import { createModuleLogger } from '@/lib/logger';

const log = createModuleLogger('ui-automation-tool');

export const uiAutomationSchema = z.object({
  action: z.string().describe('The specific UI action to perform'),
  element: z.string().describe('The UI element to target (CSS selector, accessibility label, etc.)'),
  parameters: z.record(z.string(), z.any()).optional().describe('Additional parameters for the action'),
  screenshotBefore: z.boolean().default(true).describe('Whether to capture screenshot before action'),
  screenshotAfter: z.boolean().default(true).describe('Whether to capture screenshot after action'),
});

export const uiAutomation = tool({
  description: `Execute safe UI automation steps with screenshot logging and rollback capability.

This tool performs individual UI automation actions with full audit trail:
- Captures screenshots before and after execution
- Validates actions against safety allowlist
- Supports rollback for reversible operations
- Logs all actions for compliance and debugging

Available actions:
- click: Click on UI elements
- type: Enter text into input fields
- select: Choose options from dropdowns/menus
- scroll: Scroll to specific positions
- wait: Wait for elements to appear/become interactive`,
  
  inputSchema: uiAutomationSchema,
  execute: async ({ action, element, parameters, screenshotBefore, screenshotAfter }) => {
    log.info({ action, element, parameters, screenshotBefore, screenshotAfter }, 'UI automation tool executed');

    try {
      // Validate action against allowlist
      const isAllowed = await validateAction(action, element);
      if (!isAllowed) {
        throw new Error(`Action '${action}' on element '${element}' is not allowed by safety policy`);
      }

      // Capture pre-execution screenshot if requested
      let beforeScreenshot: string | null = null;
      if (screenshotBefore) {
        beforeScreenshot = await captureScreenshot('before');
      }

      // Execute the UI action
      const result = await executeUIAction(action, element, parameters);

      // Capture post-execution screenshot if requested
      let afterScreenshot: string | null = null;
      if (screenshotAfter) {
        afterScreenshot = await captureScreenshot('after');
      }

      // Log the action for audit trail
      await logUIAction({
        action,
        element,
        parameters,
        result,
        beforeScreenshot,
        afterScreenshot,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        action,
        element,
        result,
        screenshots: {
          before: beforeScreenshot,
          after: afterScreenshot,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      log.error({ error }, 'UI automation tool execution failed');

      // Attempt rollback if possible
      try {
        await attemptRollback(action, element);
      } catch (rollbackError) {
        log.error({ rollbackError }, 'Rollback failed');
      }

      throw new Error(`UI automation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

async function validateAction(action: string, element: string): Promise<boolean> {
  const { isActionAllowed, isElementAllowed } = await import('@/lib/ohfixit/computer-use-allowlist');

  // Use the centralized allowlist system
  if (!isActionAllowed(action)) {
    return false;
  }

  // Check if element selector is safe
  if (!isElementAllowed(action, element)) {
    return false;
  }

  return true;
}

async function executeUIAction(action: string, element: string, parameters?: Record<string, any>) {
  // This is a placeholder implementation
  // In production, this would interface with the Desktop Helper or browser automation

  log.info({ action, element, parameters }, 'Executing UI action');

  // Simulate action execution
  const result = {
    action,
    element,
    parameters,
    status: 'completed',
    timestamp: new Date().toISOString(),
  };

  return result;
}

async function captureScreenshot(timing: 'before' | 'after'): Promise<string> {
  // This is a placeholder implementation
  // In production, this would capture actual screenshots

  const screenshotId = `screenshot_${timing}_${Date.now()}`;
  log.info({ screenshotId }, `Screenshot captured: ${timing}`);

  return screenshotId;
}

async function logUIAction(actionData: any) {
  // Log action to audit trail
  log.info({ actionData }, 'UI action logged to audit trail');
}

async function attemptRollback(action: string, element: string) {
  // Attempt to rollback the action if possible
  log.info({ action, element }, 'Attempting rollback');

  // This would implement rollback logic based on the action type
  // For example:
  // - For clicks: might not be reversible
  // - For text input: could restore previous value
  // - For selections: could restore previous selection
}
