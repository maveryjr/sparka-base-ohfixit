import { z } from 'zod';
import { createModuleLogger } from '@/lib/logger';

const log = createModuleLogger('computer-use-allowlist');

// Action categories for better organization
export const ACTION_CATEGORIES = {
  NAVIGATION: 'navigation',
  INPUT: 'input',
  SELECTION: 'selection',
  SYSTEM: 'system',
  APPLICATION: 'application',
} as const;

export type ActionCategory = typeof ACTION_CATEGORIES[keyof typeof ACTION_CATEGORIES];

// Safe action definitions
export interface SafeAction {
  id: string;
  name: string;
  category: ActionCategory;
  description: string;
  risk: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  rollbackSupported: boolean;
  allowedElements: string[]; // CSS selectors or accessibility attributes
  parameters: Record<string, any>;
  preconditions?: string[]; // Conditions that must be met
  postconditions?: string[]; // Expected outcomes
}

// Core allowlist of safe computer use actions
export const COMPUTER_USE_ALLOWLIST: SafeAction[] = [
  // Navigation actions
  {
    id: 'click_button',
    name: 'Click Button',
    category: ACTION_CATEGORIES.NAVIGATION,
    description: 'Click on buttons and interactive elements',
    risk: 'low',
    requiresApproval: false,
    rollbackSupported: false,
    allowedElements: [
      '[role="button"]',
      'button',
      '[onclick]',
      '.btn',
      '.button',
      '[data-testid*="button"]',
    ],
    parameters: {
      element: 'string',
      waitForResult: 'boolean?',
    },
  },
  {
    id: 'click_link',
    name: 'Click Link',
    category: ACTION_CATEGORIES.NAVIGATION,
    description: 'Click on links and navigation elements',
    risk: 'low',
    requiresApproval: false,
    rollbackSupported: false,
    allowedElements: [
      'a[href]',
      '[role="link"]',
      '[data-testid*="link"]',
    ],
    parameters: {
      element: 'string',
      newTab: 'boolean?',
    },
  },

  // Input actions
  {
    id: 'type_text',
    name: 'Type Text',
    category: ACTION_CATEGORIES.INPUT,
    description: 'Enter text into input fields',
    risk: 'low',
    requiresApproval: false,
    rollbackSupported: true,
    allowedElements: [
      'input[type="text"]',
      'input[type="email"]',
      'input[type="password"]',
      'input[type="search"]',
      'textarea',
      '[role="textbox"]',
      '[contenteditable="true"]',
    ],
    parameters: {
      element: 'string',
      text: 'string',
      clearFirst: 'boolean?',
    },
    preconditions: ['element must be visible and enabled'],
    postconditions: ['text should be entered in the field'],
  },
  {
    id: 'clear_input',
    name: 'Clear Input',
    category: ACTION_CATEGORIES.INPUT,
    description: 'Clear text from input fields',
    risk: 'low',
    requiresApproval: false,
    rollbackSupported: true,
    allowedElements: [
      'input[type="text"]',
      'input[type="email"]',
      'input[type="search"]',
      'textarea',
      '[role="textbox"]',
    ],
    parameters: {
      element: 'string',
    },
  },

  // Selection actions
  {
    id: 'select_option',
    name: 'Select Option',
    category: ACTION_CATEGORIES.SELECTION,
    description: 'Select options from dropdown menus',
    risk: 'low',
    requiresApproval: false,
    rollbackSupported: true,
    allowedElements: [
      'select',
      '[role="combobox"]',
      '[role="listbox"]',
    ],
    parameters: {
      element: 'string',
      option: 'string',
    },
  },
  {
    id: 'select_checkbox',
    name: 'Select Checkbox',
    category: ACTION_CATEGORIES.SELECTION,
    description: 'Check or uncheck checkboxes',
    risk: 'low',
    requiresApproval: false,
    rollbackSupported: true,
    allowedElements: [
      'input[type="checkbox"]',
      '[role="checkbox"]',
    ],
    parameters: {
      element: 'string',
      checked: 'boolean',
    },
  },
  {
    id: 'select_radio',
    name: 'Select Radio Button',
    category: ACTION_CATEGORIES.SELECTION,
    description: 'Select radio button options',
    risk: 'low',
    requiresApproval: false,
    rollbackSupported: true,
    allowedElements: [
      'input[type="radio"]',
      '[role="radio"]',
    ],
    parameters: {
      element: 'string',
    },
  },

  // System actions (high risk, require approval)
  {
    id: 'scroll_page',
    name: 'Scroll Page',
    category: ACTION_CATEGORIES.SYSTEM,
    description: 'Scroll the page to a specific position',
    risk: 'low',
    requiresApproval: false,
    rollbackSupported: true,
    allowedElements: ['window', 'body', 'html'],
    parameters: {
      direction: 'string', // 'up', 'down', 'left', 'right'
      amount: 'number?',
    },
  },
  {
    id: 'take_screenshot',
    name: 'Take Screenshot',
    category: ACTION_CATEGORIES.SYSTEM,
    description: 'Capture screenshot of current screen',
    risk: 'low',
    requiresApproval: false,
    rollbackSupported: false,
    allowedElements: ['window'],
    parameters: {
      region: 'object?',
      format: 'string?',
    },
  },

  // Application-specific actions (medium risk)
  {
    id: 'open_application',
    name: 'Open Application',
    category: ACTION_CATEGORIES.APPLICATION,
    description: 'Open a specific application',
    risk: 'medium',
    requiresApproval: true,
    rollbackSupported: true,
    allowedElements: [],
    parameters: {
      applicationName: 'string',
    },
    preconditions: ['application must be installed'],
    postconditions: ['application should open successfully'],
  },
  {
    id: 'close_window',
    name: 'Close Window',
    category: ACTION_CATEGORIES.APPLICATION,
    description: 'Close the current or specified window',
    risk: 'medium',
    requiresApproval: true,
    rollbackSupported: false,
    allowedElements: ['window'],
    parameters: {
      windowTitle: 'string?',
    },
    preconditions: ['unsaved changes should be handled'],
  },
];

// Validation functions
export function isActionAllowed(actionId: string): boolean {
  return COMPUTER_USE_ALLOWLIST.some(action => action.id === actionId);
}

export function getActionDefinition(actionId: string): SafeAction | null {
  return COMPUTER_USE_ALLOWLIST.find(action => action.id === actionId) || null;
}

export function isElementAllowed(actionId: string, element: string): boolean {
  const action = getActionDefinition(actionId);
  if (!action) return false;

  // Special case for window/document level actions
  if (action.allowedElements.includes('window') || action.allowedElements.includes('body') || action.allowedElements.includes('html')) {
    return ['window', 'body', 'html', 'document'].includes(element);
  }

  // Check if element matches any allowed selector pattern
  return action.allowedElements.some(allowed => {
    // Simple pattern matching - in production this would be more sophisticated
    return element.includes(allowed) || allowed.includes(element);
  });
}

export function getActionsByCategory(category: ActionCategory): SafeAction[] {
  return COMPUTER_USE_ALLOWLIST.filter(action => action.category === category);
}

export function getActionsByRisk(risk: 'low' | 'medium' | 'high'): SafeAction[] {
  return COMPUTER_USE_ALLOWLIST.filter(action => action.risk === risk);
}

export function validateActionParameters(actionId: string, parameters: Record<string, any>): boolean {
  const action = getActionDefinition(actionId);
  if (!action) return false;

  // Basic parameter validation - in production this would be more sophisticated
  for (const [paramName, paramType] of Object.entries(action.parameters)) {
    const expectedType = paramType.replace('?', '');
    const isOptional = paramType.endsWith('?');

    if (!isOptional && !(paramName in parameters)) {
      log.warn({ actionId, paramName }, 'Required parameter missing');
      return false;
    }

    if (paramName in parameters) {
      const value = parameters[paramName];
      // Type checking (basic implementation)
      switch (expectedType) {
        case 'string':
          if (typeof value !== 'string') return false;
          break;
        case 'number':
          if (typeof value !== 'number') return false;
          break;
        case 'boolean':
          if (typeof value !== 'boolean') return false;
          break;
        case 'object':
          if (typeof value !== 'object' || value === null) return false;
          break;
      }
    }
  }

  return true;
}

// Export for use in other modules
export const ALLOWLIST_CONFIG = {
  maxExecutionTime: 30000, // 30 seconds
  maxRetries: 3,
  enableRollback: true,
  auditAllActions: true,
  requireApprovalForMediumRisk: true,
  requireApprovalForHighRisk: true,
} as const;
