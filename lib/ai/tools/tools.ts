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
import { guideSteps } from '@/lib/ai/tools/ohfixit/guide-steps';
import createClientEnvTool from '@/lib/ai/tools/ohfixit/client-env';
import createNetworkCheckTool from '@/lib/ai/tools/ohfixit/network-check';
import { getAnonymousSession } from '@/lib/anonymous-session-server';

export function getTools({
  dataStream,
  session,
  messageId,
  selectedModel,
  attachments = [],
  lastGeneratedImage = null,
  contextForLLM,
}: {
  dataStream: StreamWriter;
  session: Session;
  messageId: string;
  selectedModel: ModelId;
  attachments: Array<FileUIPart>;
  lastGeneratedImage: { imageUrl: string; name: string } | null;
  contextForLLM: ModelMessage[];
}) {
  const anonymousIdPromise = getAnonymousSession().then((s) => s?.id || null).catch(() => null);
  return {
    getWeather,
    guideSteps,
    // OhFixIt diagnostics tools
    clientEnv: createClientEnvTool({ userId: session?.user?.id, anonymousId: undefined }),
    networkCheck: createNetworkCheckTool({ userId: session?.user?.id, anonymousId: undefined }),
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
  };
}
