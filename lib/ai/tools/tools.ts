import type { ModelMessage, FileUIPart } from 'ai';
import { createDocumentTool } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { retrieve } from '@/lib/ai/tools/retrieve';
import { tavilyWebSearch } from '@/lib/ai/tools/web-search';
import { stockChart } from '@/lib/ai/tools/stock-chart';
import { codeInterpreter } from '@/lib/ai/tools/code-interpreter';
import type { Session } from 'next-auth';
import { readDocument } from '@/lib/ai/tools/read-document';
import { generateImage } from '@/lib/ai/tools/generate-image';
import type { ModelId } from '@/lib/ai/model-id';
import type { StreamWriter } from '../types';
import { deepResearch } from './deep-research/deep-research';
import { createGuideSteps } from './ohfixit/guide-steps';
import { healthScan } from './ohfixit/health-scan';
import { automation } from './ohfixit/automation';
import { getPlaybook, executePlaybookStep } from './ohfixit/issue-playbooks';
import { enhancedAutomation } from './ohfixit/enhanced-automation';
import { oneClickFixTool } from '../../ohfixit/one-click-fixes';
import createClientEnvTool from './ohfixit/client-env';
import createNetworkCheckTool from './ohfixit/network-check';
import { computerUse } from './computer-use';
import { uiAutomation } from './ui-automation';
import { screenshotCapture } from './screenshot-capture';
import { getAnonymousSession } from '@/lib/anonymous-session-server';
import { guideToAutomation } from './ohfixit/guide-to-automation';
import { getActionArtifacts } from './ohfixit/get-action-artifacts';
import { getConsentLog } from './ohfixit/get-consent-log';
import { analyzeScript } from './ohfixit/analyze-script';
import { saveFixlet } from './ohfixit/fixlet-save';
import { orchestrate } from '../tools/orchestrate';
import { startHandoff } from './ohfixit/start-handoff';

export async function getTools({
  dataStream,
  session,
  messageId,
  selectedModel,
  attachments = [],
  lastGeneratedImage = null,
  contextForLLM,
  chatId,
}: {
  dataStream: StreamWriter;
  session: Session;
  messageId: string;
  selectedModel: ModelId;
  attachments: Array<FileUIPart>;
  lastGeneratedImage: { imageUrl: string; name: string } | null;
  contextForLLM: ModelMessage[];
  chatId: string;
}) {
  const anonymousIdPromise = getAnonymousSession().then((s) => s?.id || null).catch(() => null);
  const anonymousId = await anonymousIdPromise;

  return {
    // Put automation tool FIRST to make it prominent
    automation,
    getWeather,
    guideSteps: createGuideSteps({
      session: { ...session, anonymousId } as any,
      dataStream,
      messageId,
      selectedModel,
      attachments,
      contextForLLM,
      chatId,
    }),
    healthScan,
    guideToAutomation,
    getActionArtifacts,
    getConsentLog,
    analyzeScript,
    saveFixlet,
    orchestrate,
    startHandoff,
    // OhFixIt Phase 2 tools
    getPlaybook,
    executePlaybookStep,
    enhancedAutomation,
    oneClickFixTool,
    // OhFixIt diagnostics tools
    clientEnv: createClientEnvTool({ userId: session?.user?.id, anonymousId: undefined, chatId }),
    networkCheck: createNetworkCheckTool({ userId: session?.user?.id, anonymousId: undefined, chatId }),
    createDocument: createDocumentTool({
      session,
      dataStream,
      contextForLLM,
      messageId,
      selectedModel,
    }),
    updateDocument: updateDocument({
      session,
      dataStream,
      messageId,
      selectedModel,
    }),
    requestSuggestions: requestSuggestions({
      session,
      dataStream,
    }),
    readDocument: readDocument({
      session,
      dataStream,
    }),
    // reasonSearch: createReasonSearch({
    //   session,
    //   dataStream,
    // }),
    retrieve,
    webSearch: tavilyWebSearch({ dataStream, writeTopLevelUpdates: true }),
    stockChart,
    codeInterpreter,
    generateImage: generateImage({ attachments, lastGeneratedImage }),
    deepResearch: deepResearch({
      session,
      dataStream,
      messageId,
      messages: contextForLLM,
    }),
    // Computer use tools (Phase 4)
    computerUse,
    uiAutomation,
    screenshotCapture,
  };
}
