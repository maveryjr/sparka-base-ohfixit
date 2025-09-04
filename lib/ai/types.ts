import { z } from 'zod';
import type { getWeather } from '@/lib/ai/tools/get-weather';
import type { updateDocument } from '@/lib/ai/tools/update-document';
import type { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import type { deepResearch } from '@/lib/ai/tools/deep-research/deep-research';
import type { readDocument } from '@/lib/ai/tools/read-document';
import type { generateImage } from '@/lib/ai/tools/generate-image';
import type { tavilyWebSearch } from '@/lib/ai/tools/web-search';
import type { stockChart } from '@/lib/ai/tools/stock-chart';
import type { codeInterpreter } from '@/lib/ai/tools/code-interpreter';
import type { retrieve } from '@/lib/ai/tools/retrieve';
import type { InferUITool, UIMessage, UIMessageStreamWriter } from 'ai';

import type { ArtifactKind } from '../artifacts/artifact-kind';
import type { Suggestion } from '@/lib/db/schema';
import type { ResearchUpdate } from './tools/research-updates-schema';
import type { createDocumentTool as createDocument } from './tools/create-document';
import type { ModelId } from './model-id';

export const toolNameSchema = z.enum([
  'getWeather',
  'createDocument',
  'updateDocument',
  'requestSuggestions',
  'readDocument',
  'retrieve',
  'webSearch',
  'stockChart',
  'codeInterpreter',
  'generateImage',
  'deepResearch',
  'guideSteps',
  'automation',
  'getPlaybook',
  'executePlaybookStep',
  'enhancedAutomation',
  'oneClickFixTool',
  'clientEnv',
  'networkCheck',
  'computerUse',
  'uiAutomation',
  'screenshotCapture',
]);

const _ = toolNameSchema.options satisfies ToolName[];

type ToolNameInternal = z.infer<typeof toolNameSchema>;

export const frontendToolsSchema = z.enum([
  'webSearch',
  'deepResearch',
  'generateImage',
  'createDocument',
  'guideSteps',
  // Note: automation is not directly user-selectable as a primary tool in MVP.
]);

const __ = frontendToolsSchema.options satisfies ToolNameInternal[];

export type UiToolName = z.infer<typeof frontendToolsSchema>;
export const messageMetadataSchema = z.object({
  createdAt: z.date(),
  parentMessageId: z.string().nullable(),
  selectedModel: z.custom<ModelId>((val) => typeof val === 'string'),
  isPartial: z.boolean().optional(),
  selectedTool: frontendToolsSchema.optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type deepResearchTool = InferUITool<ReturnType<typeof deepResearch>>;
type readDocumentTool = InferUITool<ReturnType<typeof readDocument>>;
type generateImageTool = InferUITool<ReturnType<typeof generateImage>>;
type webSearchTool = InferUITool<ReturnType<typeof tavilyWebSearch>>;
type stockChartTool = InferUITool<typeof stockChart>;
type codeInterpreterTool = InferUITool<typeof codeInterpreter>;
type retrieveTool = InferUITool<typeof retrieve>;
// Diagnostics + OhFixIt tools
type guideStepsTool = InferUITool<typeof import('./tools/ohfixit/guide-steps')['guideSteps']>;
type automationTool = InferUITool<typeof import('./tools/ohfixit/automation')['automation']>;
type getPlaybookTool = InferUITool<typeof import('./tools/ohfixit/issue-playbooks')['getPlaybook']>;
type executePlaybookStepTool = InferUITool<typeof import('./tools/ohfixit/issue-playbooks')['executePlaybookStep']>;
type enhancedAutomationTool = InferUITool<typeof import('./tools/ohfixit/enhanced-automation')['enhancedAutomation']>;
type oneClickFixTool = InferUITool<typeof import('../../ohfixit/one-click-fixes')['oneClickFixTool']>;
// For factory tools, we reference the Tool type by creating a temporary type helper
type _ClientEnvTool = ReturnType<
  typeof import('./tools/ohfixit/client-env').default
>;
type clientEnvTool = InferUITool<_ClientEnvTool>;
type _NetworkCheckTool = ReturnType<
  typeof import('./tools/ohfixit/network-check').default
>;
type networkCheckTool = InferUITool<_NetworkCheckTool>;
// Computer use tools
type computerUseTool = InferUITool<typeof import('./tools/computer-use')['computerUse']>;
type uiAutomationTool = InferUITool<typeof import('./tools/ui-automation')['uiAutomation']>;
type screenshotCaptureTool = InferUITool<typeof import('./tools/screenshot-capture')['screenshotCapture']>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  deepResearch: deepResearchTool;
  readDocument: readDocumentTool;
  generateImage: generateImageTool;
  webSearch: webSearchTool;
  stockChart: stockChartTool;
  codeInterpreter: codeInterpreterTool;
  retrieve: retrieveTool;
  guideSteps: guideStepsTool;
  automation: automationTool;
  getPlaybook: getPlaybookTool;
  executePlaybookStep: executePlaybookStepTool;
  enhancedAutomation: enhancedAutomationTool;
  oneClickFixTool: oneClickFixTool;
  clientEnv: clientEnvTool;
  networkCheck: networkCheckTool;
  computerUse: computerUseTool;
  uiAutomation: uiAutomationTool;
  screenshotCapture: screenshotCaptureTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  messageId: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  researchUpdate: ResearchUpdate;
  guidePlanPartial: any; // Partial streaming object from AI SDK
};

export type ChatMessage = Omit<
  UIMessage<MessageMetadata, CustomUIDataTypes, ChatTools>,
  'metadata'
> & {
  metadata: MessageMetadata;
};

export type ToolName = keyof ChatTools;

export type StreamWriter = UIMessageStreamWriter<ChatMessage>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}
