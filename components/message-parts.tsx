'use client';

import { memo, useMemo } from 'react';
import { Weather } from './weather';
import { TextMessagePart } from './text-message-part';
import { DocumentPreview } from './document-preview';
import { DocumentToolCall, DocumentToolResult } from './document';
import { MessageReasoning } from './message-reasoning';
import { Retrieve } from './retrieve';
import { ReadDocument } from './read-document';
import { StockChartMessage } from './stock-chart-message';
import { CodeInterpreterMessage } from './code-interpreter-message';
import { GeneratedImage } from './generated-image';
import { ResearchUpdates } from './message-annotations';
import { GuideSteps } from '@/components/ohfixit/guide-steps';
import { HealthScan } from '@/components/ohfixit/health-scan';
import { AutomationPlanView } from '@/components/ohfixit/action-preview';
import { AutomationResult } from '@/components/ohfixit/automation-result';
import { ActionArtifacts } from '@/components/ohfixit/action-artifacts';
import { AuditTrail } from '@/components/ohfixit/audit-trail';
import { HandoffBanner } from '@/components/ohfixit/handoff';
import { OrchestratorPlan } from '@/components/ohfixit/orchestrator-plan';
import { SelectorPreview } from '@/components/ohfixit/selector-preview';
import type { ChatMessage } from '@/lib/ai/types';
import {
  chatStore,
  useMessagePartTypesById,
  useMessagePartByPartIdx,
  useMessagePartsByPartRange,
  useMessagePartsById,
} from '@/lib/stores/chat-store';

type MessagePartsProps = {
  messageId: string;
  isLoading: boolean;
  isReadonly: boolean;
};

const isLastArtifact = (
  messages: ChatMessage[],
  currentToolCallId: string,
): boolean => {
  let lastArtifact: { messageIndex: number; toolCallId: string } | null = null;
  let lastAutomationResult: { messageIndex: number; toolCallId: string; result: any } | null = null;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'assistant') {
      for (const part of message.parts) {
        if (
          (part.type === 'tool-createDocument' ||
            part.type === 'tool-updateDocument' ||
            part.type === 'tool-deepResearch') &&
          part.state === 'output-available'
        ) {
          lastArtifact = {
            messageIndex: i,
            toolCallId: part.toolCallId,
          };
          break;
        }
      }
      if (lastArtifact) break;
    }
  }

  return lastArtifact?.toolCallId === currentToolCallId;
};

function useResearchUpdates(
  messageId: string,
  partIdx: number,
  type: ChatMessage['parts'][number]['type'],
) {
  const types = useMessagePartTypesById(messageId);
  const startIdx = partIdx;
  const nextIdx = types.findIndex(
    (t, i) =>
      i > startIdx && (t === 'tool-deepResearch' || t === 'tool-webSearch'),
  );

  // If not a research tool, constrain the range to empty to minimize work
  let sliceEnd = nextIdx === -1 ? types.length - 1 : nextIdx - 1;
  if (type !== 'tool-deepResearch' && type !== 'tool-webSearch') {
    sliceEnd = startIdx;
  }

  const range = useMessagePartsByPartRange(messageId, startIdx + 1, sliceEnd);

  if (type !== 'tool-deepResearch' && type !== 'tool-webSearch') {
    return [] as Array<
      Extract<
        ChatMessage['parts'][number],
        { type: 'data-researchUpdate' }
      >['data']
    >;
  }

  return range
    .filter((p) => p.type === 'data-researchUpdate')
    .map(
      (u) =>
        (
          u as Extract<
            ChatMessage['parts'][number],
            { type: 'data-researchUpdate' }
          >
        ).data,
    );
}

const collectResearchUpdates = (
  parts: ChatMessage['parts'],
  toolCallId: string,
  toolType: 'tool-deepResearch' | 'tool-webSearch',
) => {
  const startIdx = parts.findIndex(
    (p) => p.type === toolType && p.toolCallId === toolCallId,
  );
  if (startIdx === -1) return [];

  const endIdx = parts.findIndex(
    (p, i) =>
      i > startIdx &&
      (p.type === 'tool-deepResearch' || p.type === 'tool-webSearch'),
  );

  const sliceEnd = endIdx === -1 ? parts.length : endIdx;
  return parts
    .slice(startIdx + 1, sliceEnd)
    .filter((p) => p.type === 'data-researchUpdate')
    .map((u) => u.data);
};

// Render a single part by index with minimal subscriptions
function PureMessagePart({
  messageId,
  partIdx,
  isReadonly,
}: {
  messageId: string;
  partIdx: number;
  isReadonly: boolean;
}) {
  const part = useMessagePartByPartIdx(messageId, partIdx);
  const { type } = part;
  const researchUpdates = useResearchUpdates(messageId, partIdx, type);

  if (type === 'tool-getWeather') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      return (
        <div key={toolCallId} className="skeleton">
          <Weather />
        </div>
      );
    }
    if (state === 'output-available') {
      const { output } = part;
      return (
        <div key={toolCallId}>
          <Weather weatherAtLocation={output} />
        </div>
      );
    }
  }

  if (type === 'tool-createDocument') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      const { input } = part;
      return (
        <div key={toolCallId}>
          <DocumentPreview
            isReadonly={isReadonly}
            args={input}
            messageId={messageId}
          />
        </div>
      );
    }

    if (state === 'output-available') {
      const { output, input } = part;
      const shouldShowFullPreview = isLastArtifact(
        chatStore.getState().messages,
        toolCallId,
      );

      if ('error' in output) {
        return (
          <div key={toolCallId} className="text-red-500 p-2 border rounded">
            Error: {String(output.error)}
          </div>
        );
      }

      return (
        <div key={toolCallId}>
          {shouldShowFullPreview ? (
            <DocumentPreview
              isReadonly={isReadonly}
              result={output}
              args={input}
              messageId={messageId}
              type="create"
            />
          ) : (
            <DocumentToolResult
              type="create"
              result={output}
              isReadonly={isReadonly}
              messageId={messageId}
            />
          )}
        </div>
      );
    }
  }

  if (type === 'tool-updateDocument') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      const { input } = part;
      return (
        <div key={toolCallId}>
          <DocumentToolCall
            type="update"
            // @ts-expect-error - TODO: fix this
            args={input}
            isReadonly={isReadonly}
          />
        </div>
      );
    }

    if (state === 'output-available') {
      const { output, input } = part;
      const shouldShowFullPreview = isLastArtifact(
        chatStore.getState().messages,
        toolCallId,
      );

      if ('error' in output) {
        return (
          <div key={toolCallId} className="text-red-500 p-2 border rounded">
            Error: {String(output.error)}
          </div>
        );
      }

      return (
        <div key={toolCallId}>
          {shouldShowFullPreview ? (
            <DocumentPreview
              isReadonly={isReadonly}
              result={output}
              args={input}
              messageId={messageId}
              type="update"
            />
          ) : (
            <DocumentToolResult
              type="update"
              result={output}
              isReadonly={isReadonly}
              messageId={messageId}
            />
          )}
        </div>
      );
    }
  }

  if (type === 'tool-requestSuggestions') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      const { input } = part;
      return (
        <div key={toolCallId}>
          <DocumentToolCall
            type="request-suggestions"
            // @ts-expect-error - TODO: fix this
            args={input}
            isReadonly={isReadonly}
          />
        </div>
      );
    }

    if (state === 'output-available') {
      const { output } = part;
      if ('error' in output) {
        return (
          <div key={toolCallId} className="text-red-500 p-2 border rounded">
            Error: {String(output.error)}
          </div>
        );
      }

      return (
        <div key={toolCallId}>
          <DocumentToolResult
            type="request-suggestions"
            result={output}
            isReadonly={isReadonly}
            messageId={messageId}
          />
        </div>
      );
    }
  }

  if (type === 'tool-retrieve') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      return (
        <div key={toolCallId}>
          <Retrieve />
        </div>
      );
    }

    if (state === 'output-available') {
      const { output } = part;
      return (
        <div key={toolCallId}>
          {/* @ts-expect-error - TODO: fix this */}
          <Retrieve result={output} />
        </div>
      );
    }
  }

  if (type === 'tool-readDocument') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      return null;
    }
    if (state === 'output-available') {
      const { output } = part;
      return (
        <div key={toolCallId}>
          {/* @ts-expect-error - TODO: fix this */}
          <ReadDocument result={output} />
        </div>
      );
    }
  }

  if (type === 'tool-guideSteps') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      return (
        <div key={toolCallId} className="text-muted-foreground text-sm">
          Planning a step-by-step guide…
        </div>
      );
    }
    if (state === 'output-available') {
      const { output } = part as any;
      if (!output) return null;
      return <GuideSteps plan={output} className="my-2" />;
    }
  }

  if (type === 'tool-healthScan') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      return (
        <div key={toolCallId} className="text-muted-foreground text-sm">
          Scheduling health scan…
        </div>
      );
    }
    if (state === 'output-available') {
      // The tool output contains hints (chatId/checks); the component will run and poll via API.
      const { output } = part as any;
      return <HealthScan chatId={output?.chatId ?? null} checks={output?.checks} />;
    }
  }

  if (type === 'tool-getActionArtifacts') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      return (
        <div key={toolCallId} className="text-muted-foreground text-sm">
          Loading artifacts…
        </div>
      );
    }
    if (state === 'output-available') {
      const { output } = part as any;
      if (output?.error) {
        return (
          <div key={toolCallId} className="text-red-500 p-2 border rounded">
            Error: {String(output.error)}
          </div>
        );
      }
      return (
        <ActionArtifacts artifacts={output?.artifacts || []} />
      );
    }
  }

  if (type === 'tool-getConsentLog') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      return (
        <div key={toolCallId} className="text-muted-foreground text-sm">
          Loading audit timeline…
        </div>
      );
    }
    if (state === 'output-available') {
      const { output } = part as any;
      if (!output) return null;
      return <AuditTrail events={(output.events || []).map((e: any) => ({ id: e.id, createdAt: e.createdAt, type: e.type, actionType: e.actionType, status: e.status, kind: e.kind, summary: e.summary }))} />;
    }
  }

  if (type === 'tool-startHandoff') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      return (
        <div key={toolCallId} className="text-muted-foreground text-sm">
          Starting human handoff…
        </div>
      );
    }
    if (state === 'output-available') {
      const { output } = part as any;
      if (!output) return null;
      return <HandoffBanner session={output} />;
    }
  }

  if (type === 'tool-orchestrate') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      return (
        <div key={toolCallId} className="text-muted-foreground text-sm">
          Planning best next steps…
        </div>
      );
    }
    if (state === 'output-available') {
      const { output } = part as any;
      if (!output) return null;
      return <OrchestratorPlan summary={output.summary} items={output.items || []} />;
    }
  }

  if (type === 'tool-uiAutomation') {
    const { toolCallId, state } = part as any;
    if (state === 'input-available') {
      return (
        <div key={toolCallId} className="text-muted-foreground text-sm">
          Preparing UI automation…
        </div>
      );
    }
    if (state === 'output-available') {
      const { output } = part as any;
      const preview = output?.result?.preview;
      if (preview?.selector) {
        return (
          <div key={toolCallId} className="my-2">
            <SelectorPreview selector={preview.selector} label={preview.label || preview.action} />
          </div>
        );
      }
      return (
        <div key={toolCallId} className="rounded border p-3 text-sm">
          <div className="text-xs text-muted-foreground">Automation completed.</div>
        </div>
      );
    }
  }

  if (type === 'data-guidePlanPartial') {
    const { data } = part as any;
    if (!data) return null;
    
    return (
      <div className="my-2 border rounded-lg p-4 bg-muted/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">Planning guide...</span>
        </div>
        
        {data.summary && (
          <div className="mb-4">
            <h3 className="font-medium text-sm mb-2">Plan Summary</h3>
            <p className="text-sm text-muted-foreground">{data.summary}</p>
          </div>
        )}
        
        {data.steps && data.steps.length > 0 && (
          <div>
            <h3 className="font-medium text-sm mb-2">Steps ({data.steps.length})</h3>
            <div className="space-y-2">
              {data.steps.map((step: any, index: number) => (
                <div key={step?.id || index} className="border rounded p-3 bg-background/50">
                  {step?.title && (
                    <h4 className="font-medium text-sm mb-1">{step.title}</h4>
                  )}
                  {step?.rationale && (
                    <p className="text-xs text-muted-foreground mb-2">{step.rationale}</p>
                  )}
                  {step?.actions && step.actions.length > 0 && (
                    <div className="space-y-1">
                      {step.actions.map((action: any, actionIndex: number) => (
                        <div key={actionIndex} className="text-xs">
                          <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-2" />
                          {action?.text || 'Loading action...'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === 'tool-automation') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      return (
        <div key={toolCallId} className="text-muted-foreground text-sm">
          Preparing an automation plan…
        </div>
      );
    }
    if (state === 'output-available') {
      const { output } = part as any;
      if (!output) return null;
      return <AutomationPlanView plan={output} className="my-2" />;
    }
  }

  if (type === 'tool-guideToAutomation') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      return (
        <div key={toolCallId} className="text-muted-foreground text-sm">
          Converting guide into an automation plan…
        </div>
      );
    }
    if (state === 'output-available') {
      const { output } = part as any;
      if (!output) return null;
      return <AutomationPlanView plan={output} className="my-2" />;
    }
  }

  if (type === 'tool-clientEnv') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      return (
        <div key={toolCallId} className="text-muted-foreground text-sm">
          Reading client environment…
        </div>
      );
    }
    if (state === 'output-available') {
      // show a compact summary
      const { output } = part as any;
      const ua = output?.client?.data?.userAgent;
      const os = output?.osCapabilities?.family;
      return (
        <div key={toolCallId} className="rounded border p-3 text-sm space-y-1">
          <div>OS: {os || 'Unknown'}</div>
          <div>User Agent: <span className="break-words">{ua || 'n/a'}</span></div>
        </div>
      );
    }
  }

  if (type === 'tool-networkCheck') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      return (
        <div key={toolCallId} className="text-muted-foreground text-sm">
          Running network checks…
        </div>
      );
    }
    if (state === 'output-available') {
      const { output } = part as any;
      const results = output?.results || [];
      return (
        <div key={toolCallId} className="rounded border p-3 text-sm">
          <div className="font-medium mb-2">Network checks</div>
          <ul className="space-y-1">
            {results.map((r: any) => (
              <li key={r.target} className="flex items-center gap-2">
                <span className={r.ok ? 'text-green-600' : 'text-red-600'}>
                  {r.ok ? 'OK' : 'Fail'}
                </span>
                <span className="truncate">{r.target}</span>
                {typeof r.latencyMs === 'number' && (
                  <span className="text-muted-foreground">{r.latencyMs} ms</span>
                )}
                {r.status && (
                  <span className="text-muted-foreground">HTTP {r.status}</span>
                )}
                {r.reason && (
                  <span className="text-muted-foreground">{r.reason}</span>
                )}
                {r.error && (
                  <span className="text-muted-foreground">{r.error}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    }
  }

  if (type === 'tool-oneClickFixTool') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      return (
        <div key={toolCallId} className="text-muted-foreground text-sm">
          Looking for one-click fixes…
        </div>
      );
    }
    if (state === 'output-available') {
      const { output } = part as any;
      if (!output) return null;
      if (output.error) {
        return (
          <div key={toolCallId} className="text-red-500 p-2 border rounded">
            Error: {String(output.error)}
          </div>
        );
      }
      if (output.found === false) {
        return (
          <div key={toolCallId} className="rounded border p-3 text-sm">
            <div className="font-medium mb-1">No matching quick fixes</div>
            <ul className="list-disc ml-5 text-xs text-muted-foreground">
              {(output.suggestions || []).map((s: string, i: number) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        );
      }
      const fixes = output.fixes || [];
      return (
        <div key={toolCallId} className="rounded border p-3 text-sm space-y-2">
          <div className="font-medium">One-click fixes</div>
          <ul className="space-y-2">
            {fixes.map((f: any) => (
              <li key={f.id} className="border rounded p-2 bg-background/50">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{f.title}</span>
                  <span className="text-xs text-muted-foreground">{f.category}</span>
                  <span className="ml-auto text-xs">{f.estimatedTime}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Risk: {f.riskLevel}</div>
                {f.description && (
                  <div className="text-xs mt-1">{f.description}</div>
                )}
              </li>
            ))}
          </ul>
          {output.recommendations && (
            <div className="text-xs text-muted-foreground">{output.recommendations[0]}</div>
          )}
        </div>
      );
    }
  }

  if (type === 'tool-analyzeScript') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      return (
        <div key={toolCallId} className="text-muted-foreground text-sm">
          Analyzing script risk…
        </div>
      );
    }
    if (state === 'output-available') {
      const { output } = part as any;
      if (!output) return null;
      return (
        <div key={toolCallId} className="rounded border p-3 text-sm">
          <div className="font-medium mb-1">Script Risk: {output.level}</div>
          <div className="text-xs text-muted-foreground mb-1">Requires consent: {String(output.requiresConsent)}</div>
          {output.factors?.length > 0 && (
            <div className="text-xs">Factors: {output.factors.join(', ')}</div>
          )}
          {output.mitigations?.length > 0 && (
            <div className="text-xs text-muted-foreground">Mitigations: {output.mitigations.join(', ')}</div>
          )}
        </div>
      );
    }
  }

  if (type === 'tool-stockChart') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      const { input } = part;
      return (
        <div key={toolCallId}>
          {/* @ts-expect-error - TODO: fix this */}
          <StockChartMessage result={null} args={input} />
        </div>
      );
    }
    if (state === 'output-available') {
      const { output, input } = part;
      return (
        <div key={toolCallId}>
          {/* @ts-expect-error - TODO: fix this */}
          <StockChartMessage result={output} args={input} />
        </div>
      );
    }
  }

  if (type === 'tool-codeInterpreter') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      const { input } = part;
      return (
        <div key={toolCallId}>
          <CodeInterpreterMessage result={null} args={input} />
        </div>
      );
    }
    if (state === 'output-available') {
      const { output, input } = part;
      return (
        <div key={toolCallId}>
          {/* @ts-expect-error - TODO: fix this */}
          <CodeInterpreterMessage result={output} args={input} />
        </div>
      );
    }
  }

  if (type === 'tool-generateImage') {
    const { toolCallId, state } = part;
    if (state === 'input-available') {
      const { input } = part;
      return (
        <div key={toolCallId}>
          <GeneratedImage args={input} isLoading={true} />
        </div>
      );
    }
    if (state === 'output-available') {
      const { output, input } = part;
      return (
        <div key={toolCallId}>
          <GeneratedImage result={output} args={input} />
        </div>
      );
    }
  }

  if (type === 'tool-automation') {
    const { toolCallId, state } = part;
    {
      const { output } = part as any;
      if (output === undefined) return null;
      if (output && typeof output === 'object' && 'error' in output) {
        return (
          <div key={toolCallId} className="text-red-500 p-2 border rounded">
            Automation Error: {String((output as any).error)}
          </div>
        );
      }
      return (
        <div key={toolCallId}>
          <AutomationResult
            plan={output as any}
            onApprove={async (actionId) => {
              try {
                const response = await fetch('/api/automation/action', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    operation: 'approve',
                    actionId,
                    chatId: 'current-chat', // TODO: Get from context
                  }),
                });

                if (!response.ok) {
                  throw new Error('Failed to approve action');
                }

                const result = await response.json();
                console.log('Action approved:', result);
              } catch (error) {
                console.error('Approval failed:', error);
                // TODO: Show error to user
              }
            }}
            onExecute={async (actionId) => {
              try {
                const response = await fetch('/api/automation/action', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    operation: 'execute',
                    actionId,
                    chatId: 'current-chat', // TODO: Get from context
                    approvalId: 'current-approval', // TODO: Get from approval state
                  }),
                });

                if (!response.ok) {
                  throw new Error('Failed to execute action');
                }

                const result = await response.json();
                console.log('Action executed:', result);
              } catch (error) {
                console.error('Execution failed:', error);
                // TODO: Show error to user
              }
            }}
          />
        </div>
      );
    }
  }

  if (type === 'tool-deepResearch') {
    const { toolCallId, state } = part;

    if (state === 'input-available') {
      return (
        <div key={toolCallId} className="flex flex-col gap-3">
          <ResearchUpdates updates={researchUpdates} />
        </div>
      );
    }
    if (state === 'output-available') {
      const { output, input } = part;
      const shouldShowFullPreview = isLastArtifact(
        chatStore.getState().messages,
        toolCallId,
      );

      if (output.format === 'report') {
        return (
          <div key={toolCallId}>
            <div className="mb-2">
              <ResearchUpdates updates={researchUpdates} />
            </div>
            {shouldShowFullPreview ? (
              <DocumentPreview
                isReadonly={isReadonly}
                result={output}
                args={input}
                messageId={messageId}
                type="create"
              />
            ) : (
              <DocumentToolResult
                type="create"
                result={output}
                isReadonly={isReadonly}
                messageId={messageId}
              />
            )}
          </div>
        );
      }
    }
  }

  if (type === 'tool-webSearch') {
    const { toolCallId, state } = part;

    if (state === 'input-available') {
      return (
        <div key={toolCallId} className="flex flex-col gap-3">
          <ResearchUpdates updates={researchUpdates} />
        </div>
      );
    }
    else {
      return (
        <div key={toolCallId} className="flex flex-col gap-3">
          <ResearchUpdates updates={researchUpdates} />
        </div>
      );
    }
  }

  return null;
}

const MessagePart = memo(PureMessagePart);

// Render contiguous reasoning parts; subscribes only to the specified range
export function PureMessageReasoningParts({
  messageId,
  startIdx,
  endIdx,
  isLoading,
}: {
  messageId: string;
  startIdx: number;
  endIdx: number;
  isLoading: boolean;
}) {
  const reasoningParts = useMessagePartsByPartRange(
    messageId,
    startIdx,
    endIdx,
    'reasoning',
  );
  return (
    <MessageReasoning
      isLoading={isLoading}
      reasoning={reasoningParts.map((p) => p.text)}
    />
  );
}

export function PureMessageParts({
  messageId,
  isLoading,
  isReadonly,
}: MessagePartsProps) {
  const types = useMessagePartTypesById(messageId);
  // We also need full parts to detect if guideSteps produced an output
  const parts = useMessagePartsById(messageId);

  // Detect presence of a guideSteps tool result in this assistant message
  const hasGuideStepsOutput = useMemo(() => {
    try {
      return parts.some(
        (p: ChatMessage['parts'][number]) =>
          p.type === 'tool-guideSteps' && (p as any).state === 'output-available',
      );
    } catch {
      return false;
    }
  }, [parts]);

  type NonReasoningPartType = Exclude<
    ChatMessage['parts'][number]['type'],
    'reasoning'
  >;

  const groups = useMemo(() => {
    const result: Array<
      | { kind: 'reasoning'; startIndex: number; endIndex: number }
      | { kind: NonReasoningPartType; index: number }
    > = [];

    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      if (t === 'reasoning') {
        const start = i;
        while (i < types.length && types[i] === 'reasoning') i++;
        const end = i - 1;
        result.push({ kind: 'reasoning', startIndex: start, endIndex: end });
        i = end;
      } else {
        result.push({ kind: t as NonReasoningPartType, index: i });
      }
    }
    return result;
  }, [types]);

  // Ensure we only render the wrap-up line once when guideSteps output exists
  let guideWrapupRendered = false;

  return groups.map((group, groupIdx) => {
    if (group.kind === 'reasoning') {
      const key = `message-${messageId}-reasoning-${groupIdx}`;
      const isLast = group.endIndex === types.length - 1;
      return (
        <PureMessageReasoningParts
          key={key}
          messageId={messageId}
          startIdx={group.startIndex}
          endIdx={group.endIndex}
          isLoading={isLoading && isLast}
        />
      );
    }

    if (group.kind === 'text') {
      // If guideSteps output exists, suppress all assistant text parts and
      // instead render a single concise wrap-up once.
      if (hasGuideStepsOutput) {
        if (guideWrapupRendered) return null;
        guideWrapupRendered = true;
        const key = `message-${messageId}-guide-wrapup-${group.index}`;
        return (
          <div key={key} className="text-sm text-muted-foreground">
            Would you like me to automate these checks and actions in sequence (where feasible) or guide you step-by-step through each task on your PC?
          </div>
        );
      }

      const key = `message-${messageId}-text-${group.index}`;
      return (
        <TextMessagePart
          key={key}
          messageId={messageId}
          partIdx={group.index}
        />
      );
    }

    const key = `message-${messageId}-part-${group.index}-${group.kind}`;
    return (
      <MessagePart
        key={key}
        messageId={messageId}
        partIdx={group.index}
        isReadonly={isReadonly}
      />
    );
  });
}

export const MessageParts = memo(PureMessageParts);
