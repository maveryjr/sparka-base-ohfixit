import { toolNameSchema, type ToolName } from '../types';

export const toolsDefinitions: Record<ToolName, ToolDefinition> = {
  getWeather: {
    name: 'getWeather',
    description: 'Get the weather in a specific location',
    cost: 1,
  },
  createDocument: {
    name: 'createDocument',
    description: 'Create a new document',
    cost: 5,
  },
  updateDocument: {
    name: 'updateDocument',
    description: 'Update a document',
    cost: 5,
  },
  requestSuggestions: {
    name: 'requestSuggestions',
    description: 'Request suggestions for a document',
    cost: 1,
  },
  readDocument: {
    name: 'readDocument',
    description: 'Read the content of a document',
    cost: 1,
  },
  // reasonSearch: {
  //   name: 'reasonSearch',
  //   description: 'Search with reasoning',
  //   cost: 50,
  // },
  retrieve: {
    name: 'retrieve',
    description: 'Retrieve information from the web',
    cost: 1,
  },
  webSearch: {
    name: 'webSearch',
    description: 'Search the web',
    cost: 3,
  },
  stockChart: {
    name: 'stockChart',
    description: 'Get the stock chart for a specific stock',
    cost: 1,
  },
  codeInterpreter: {
    name: 'codeInterpreter',
    description: 'Interpret code in a virtual environment',
    cost: 10,
  },
  generateImage: {
    name: 'generateImage',
    description: 'Generate images from text descriptions',
    cost: 5,
  },
  deepResearch: {
    name: 'deepResearch',
    description: 'Research a topic',
    cost: 50,
  },
  guideSteps: {
    name: 'guideSteps',
    description: 'Return a step-by-step user guide plan',
    cost: 1,
  },
  automation: {
    name: 'automation',
    description:
      'Propose SAFE, CONSENT-GATED system actions for macOS troubleshooting (DNS, Wi-Fi, cache, Finder). ALWAYS requires user approval.',
    cost: 2,
  },
  getPlaybook: {
    name: 'getPlaybook',
    description: 'Get a pre-built troubleshooting playbook for common issues',
    cost: 1,
  },
  executePlaybookStep: {
    name: 'executePlaybookStep',
    description: 'Execute a specific step from a troubleshooting playbook',
    cost: 3,
  },
  enhancedAutomation: {
    name: 'enhancedAutomation',
    description: 'Generate comprehensive automation plans with browser actions and system commands',
    cost: 5,
  },
  oneClickFixTool: {
    name: 'oneClickFixTool',
    description: 'Find and execute one-click fixes for common technical issues',
    cost: 3,
  },
  clientEnv: {
    name: 'clientEnv',
    description: 'Read consented client diagnostics snapshot',
    cost: 1,
  },
  networkCheck: {
    name: 'networkCheck',
    description: 'Run basic network connectivity checks',
    cost: 2,
  },
};

export const allTools = toolNameSchema.options;
export type ToolDefinition = {
  name: string;
  description: string;
  cost: number;
};
