import { create } from 'zustand';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import {
  AbstractChat,
  type ChatInit,
  type ChatState,
  type ChatStatus,
  type UIMessage,
} from 'ai';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/ai/types';
import { throttle } from '@/components/throttle';
import {
  type MarkdownCacheEntry,
  getMarkdownFromCache,
  precomputeMarkdownForAllMessages,
} from '@/lib/stores/markdown-cache';

// --- Freeze detector (RAF jitter) and action correlation ---
let __freezeDetectorStarted = false;
let __freezeRafId = 0;
let __freezeLastTs = 0;
let __lastActionLabel: string | undefined;
let __clearLastActionTimer: ReturnType<typeof setTimeout> | null = null;

function markLastAction(label: string) {
  __lastActionLabel = label;
  if (typeof window !== 'undefined') {
    if (__clearLastActionTimer) clearTimeout(__clearLastActionTimer);
    __clearLastActionTimer = setTimeout(() => {
      if (__lastActionLabel === label) __lastActionLabel = undefined;
    }, 250);
  }
}

function startFreezeDetector({
  thresholdMs = 80,
}: {
  thresholdMs?: number;
} = {}): void {
  if (typeof window === 'undefined' || __freezeDetectorStarted) return;
  __freezeDetectorStarted = true;
  __freezeLastTs = performance.now();
  const tick = (now: number) => {
    const expected = __freezeLastTs + 16.7;
    const blockedMs = now - expected;
    if (blockedMs > thresholdMs) {
      // eslint-disable-next-line no-console
      console.warn(
        '[Freeze]',
        `${Math.round(blockedMs)}ms`,
        'lastAction=',
        __lastActionLabel,
      );
    }
    __freezeLastTs = now;
    __freezeRafId = window.requestAnimationFrame(tick);
  };
  __freezeRafId = window.requestAnimationFrame(tick);
  window.addEventListener('beforeunload', () => {
    if (__freezeRafId) cancelAnimationFrame(__freezeRafId);
  });
}

// Start detector only in the browser (safe during SSR)
if (typeof window !== 'undefined') {
  startFreezeDetector({ thresholdMs: 80 });
}

// --- Markdown tokenization cache computed on throttled updates ---

// Helper types to safely derive the message part and part.type types from UI_MESSAGE
type UIMessageParts<UI_MSG> = UI_MSG extends { parts: infer P } ? P : never;
type UIMessagePart<UI_MSG> = UIMessageParts<UI_MSG> extends Array<infer I>
  ? I
  : never;
type UIMessagePartType<UI_MSG> = UIMessagePart<UI_MSG> extends { type: infer T }
  ? T
  : never;

function extractPartTypes<UI_MESSAGE extends UIMessage>(
  message: UI_MESSAGE,
): {
  partsRef: UIMessageParts<UI_MESSAGE>;
  types: Array<UIMessagePartType<UI_MESSAGE>>;
} {
  const partsRef = (message as unknown as { parts: unknown[] })
    .parts as UIMessageParts<UI_MESSAGE>;
  const types = (partsRef as Array<UIMessagePart<UI_MESSAGE>>).map(
    (part) =>
      (
        part as UIMessagePart<UI_MESSAGE> & {
          type: UIMessagePartType<UI_MESSAGE>;
        }
      ).type,
  ) as Array<UIMessagePartType<UI_MESSAGE>>;
  return { partsRef, types };
}

interface ChatStoreState<UI_MESSAGE extends UIMessage> {
  id: string | undefined;
  messages: UI_MESSAGE[];
  status: ChatStatus;
  error: Error | undefined;

  // Throttled messages cache
  _throttledMessages: UI_MESSAGE[] | null;
  // Cached selectors to prevent infinite loops
  _markdownCache: Map<string, MarkdownCacheEntry>;

  // Actions
  setId: (id: string | undefined) => void;
  setMessages: (messages: UI_MESSAGE[]) => void;
  setStatus: (status: ChatStatus) => void;
  setError: (error: Error | undefined) => void;
  setNewChat: (id: string, messages: UI_MESSAGE[]) => void;
  pushMessage: (message: UI_MESSAGE) => void;
  popMessage: () => void;
  replaceMessage: (index: number, message: UI_MESSAGE) => void;

  // Getters
  getLastMessageId: () => string | null;
  getMessageIds: () => string[];
  getThrottledMessages: () => UI_MESSAGE[];
  getInternalMessages: () => UI_MESSAGE[];
  getMessagePartTypesById: (
    messageId: string,
  ) => Array<UIMessagePartType<UI_MESSAGE>>;
  getMessagePartsRangeCached: (
    messageId: string,
    startIdx: number,
    endIdx: number,
    type?: string,
  ) => UIMessageParts<UI_MESSAGE>;
  getMarkdownBlocksForPart: (messageId: string, partIdx: number) => string[];
  getMarkdownBlockCountForPart: (messageId: string, partIdx: number) => number;
  getMarkdownBlockByIndex: (
    messageId: string,
    partIdx: number,
    blockIdx: number,
  ) => string | null;
  getMessagePartByIdxCached: (
    messageId: string,
    partIdx: number,
  ) => UIMessageParts<UI_MESSAGE>[number];

  // Helpers (moved from globals into the store)
  currentChatHelpers: Pick<
    UseChatHelpers<UI_MESSAGE>,
    'stop' | 'sendMessage' | 'regenerate'
  > | null;
  setCurrentChatHelpers: (
    helpers: Pick<
      UseChatHelpers<UI_MESSAGE>,
      'stop' | 'sendMessage' | 'regenerate'
    >,
  ) => void;
}

// Throttling configuration
const MESSAGES_THROTTLE_MS = 100;

// Create the Zustand store
export function createChatStore<UI_MESSAGE extends UIMessage>(
  initialMessages: UI_MESSAGE[] = [],
) {
  let throttledMessagesUpdater: (() => void) | null = null;

  return create<ChatStoreState<UI_MESSAGE>>()(
    devtools(
      subscribeWithSelector((set, get) => {
        // Initialize throttled messages updater
        if (!throttledMessagesUpdater) {
          throttledMessagesUpdater = throttle(() => {
            const state = get();
            const { cache } = precomputeMarkdownForAllMessages(
              state.messages,
              get()._markdownCache,
            );
            set({ _markdownCache: cache });
            set({
              _throttledMessages: [...state.messages],
            });
          }, MESSAGES_THROTTLE_MS);
        }

        const initialPrecompute =
          precomputeMarkdownForAllMessages(initialMessages);
        return {
          id: undefined,
          messages: initialMessages,
          status: 'ready',
          error: undefined,
          currentChatHelpers: null,

          // Initialize cached values
          _throttledMessages: [...initialMessages],
          _markdownCache: initialPrecompute.cache,

          setId: (id) => {
            markLastAction('chat:setId');
            set({ id });
          },
          setMessages: (messages) => {
            markLastAction('chat:setMessages');
            const { cache } = precomputeMarkdownForAllMessages(
              messages,
              get()._markdownCache,
            );
            set({
              messages: [...messages],
              _markdownCache: cache,
            });
            throttledMessagesUpdater?.();
          },
          setStatus: (status) => {
            markLastAction('chat:setStatus');
            set({ status });
          },
          setError: (error) => {
            markLastAction('chat:setError');
            set({ error });
          },
          setNewChat: (id, messages) => {
            markLastAction('chat:setNewChat');
            {
              const { cache } = precomputeMarkdownForAllMessages(messages);
              set({
                messages: [...messages],
                status: 'ready',
                error: undefined,
                id,
                _markdownCache: cache,
              });
            }
            throttledMessagesUpdater?.();
          },

          pushMessage: (message) => {
            markLastAction('chat:pushMessage');
            set((state) => ({
              messages: [...state.messages, message],
            }));
            throttledMessagesUpdater?.();
          },

          popMessage: () => {
            markLastAction('chat:popMessage');
            set((state) => ({
              messages: state.messages.slice(0, -1),
            }));
            throttledMessagesUpdater?.();
          },

          replaceMessage: (index, message) => {
            markLastAction('chat:replaceMessage');
            set((state) => ({
              messages: [
                ...state.messages.slice(0, index),
                structuredClone(message), // Deep clone for React Compiler compatibility
                ...state.messages.slice(index + 1),
              ],
            }));
            throttledMessagesUpdater?.();
          },

          setCurrentChatHelpers: (helpers) => {
            markLastAction('chat:setCurrentChatHelpers');
            set({ currentChatHelpers: helpers });
          },

          getLastMessageId: () => {
            const state = get();
            return state.messages.length > 0
              ? state.messages[state.messages.length - 1].id
              : null;
          },

          getMessageIds: () => {
            const state = get();
            return (state._throttledMessages || state.messages).map(
              (m) => m.id,
            );
          },

          getThrottledMessages: () => {
            const state = get();
            return state._throttledMessages || state.messages;
          },

          getInternalMessages: () => {
            const state = get();
            return state.messages;
          },

          getMessagePartTypesById: (messageId) => {
            const state = get();
            const message = (state._throttledMessages || state.messages).find(
              (msg) => msg.id === messageId,
            );
            if (!message)
              throw new Error(`Message not found for id: ${messageId}`);
            const { types } = extractPartTypes<UI_MESSAGE>(message);
            return types as Array<UIMessagePartType<UI_MESSAGE>>;
          },
          getMessagePartsRangeCached: (messageId, startIdx, endIdx, type?) => {
            const state = get();
            const message = (state._throttledMessages || state.messages).find(
              (msg) => msg.id === messageId,
            );
            if (!message)
              throw new Error(`Message not found for id: ${messageId}`);

            const start = Math.max(0, Math.floor(startIdx));
            const end = Math.min(message.parts.length - 1, Math.floor(endIdx));

            if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
              const empty = [] as unknown as UIMessageParts<UI_MESSAGE>;
              return empty as unknown as ReturnType<
                ChatStoreState<UI_MESSAGE>['getMessagePartsRangeCached']
              >;
            }

            const baseSlice = message.parts.slice(start, end + 1);
            const result = (
              type === undefined
                ? baseSlice
                : (baseSlice.filter(
                    (p) => p.type === type,
                  ) as unknown as UIMessageParts<UI_MESSAGE>)
            ) as UIMessageParts<UI_MESSAGE>;
            return result as UIMessageParts<UI_MESSAGE>;
          },

          getMarkdownBlocksForPart: (
            messageId: string,
            partIdx: number,
          ): string[] => {
            const state = get();
            const list = state._throttledMessages;

            if (!list) {
              throw new Error('No messages available');
            }

            const message = list.find((msg) => msg.id === messageId);
            if (!message)
              throw new Error(`Message not found for id: ${messageId}`);

            const selected = message.parts[partIdx] as unknown as
              | {
                  type: string;
                  text?: string;
                }
              | undefined;
            if (!selected)
              throw new Error(
                `Part not found for id: ${messageId} at partIdx: ${partIdx}`,
              );
            if (selected.type !== 'text')
              throw new Error(
                `Part type mismatch for id: ${messageId} at partIdx: ${partIdx}. Expected text, got ${String(
                  selected.type,
                )}`,
              );

            const text = selected.text || '';
            const cached = getMarkdownFromCache({
              cache: get()._markdownCache,
              messageId,
              partIdx,
              text,
            });
            if (cached) return cached.blocks;
            return [];
          },

          getMarkdownBlockCountForPart: (
            messageId: string,
            partIdx: number,
          ): number => {
            const state = get();
            const list = state._throttledMessages || state.messages;
            const message = list.find((msg) => msg.id === messageId);
            if (!message)
              throw new Error(`Message not found for id: ${messageId}`);

            const selected = message.parts[partIdx] as unknown as
              | { type: string; text?: string }
              | undefined;
            if (!selected)
              throw new Error(
                `Part not found for id: ${messageId} at partIdx: ${partIdx}`,
              );
            if (selected.type !== 'text')
              throw new Error(
                `Part type mismatch for id: ${messageId} at partIdx: ${partIdx}. Expected text, got ${String(
                  selected.type,
                )}`,
              );

            const text = selected.text || '';
            const cached = getMarkdownFromCache({
              cache: get()._markdownCache,
              messageId,
              partIdx,
              text,
            });

            const PREALLOCATED_BLOCKS = 100;
            if (cached)
              // Reserve by chunks of PREALLOCATED_BLOCKS size
              return Math.max(
                PREALLOCATED_BLOCKS,
                Math.ceil(cached.blocks.length / PREALLOCATED_BLOCKS) *
                  PREALLOCATED_BLOCKS,
              );
            return PREALLOCATED_BLOCKS;
          },

          getMarkdownBlockByIndex: (
            messageId: string,
            partIdx: number,
            blockIdx: number,
          ): string | null => {
            const state = get();
            const list = state._throttledMessages;

            if (!list) {
              throw new Error('No messages available');
            }

            const message = list.find((msg) => msg.id === messageId);
            if (!message)
              throw new Error(`Message not found for id: ${messageId}`);

            const selected = message.parts[partIdx] as unknown as
              | { type: string; text?: string }
              | undefined;
            if (!selected)
              throw new Error(
                `Part not found for id: ${messageId} at partIdx: ${partIdx}`,
              );
            if (selected.type !== 'text')
              throw new Error(
                `Part type mismatch for id: ${messageId} at partIdx: ${partIdx}. Expected text, got ${String(
                  selected.type,
                )}`,
              );

            const text = selected.text || '';
            const cached = getMarkdownFromCache({
              cache: get()._markdownCache,
              messageId,
              partIdx,
              text,
            });
            const blocks = cached ? cached.blocks : [];
            if (blockIdx < 0 || blockIdx >= blocks.length) return null;
            return blocks[blockIdx] ?? null;
          },

          getMessagePartByIdxCached: (messageId: string, partIdx: number) => {
            const state = get();
            const message = (state._throttledMessages || state.messages).find(
              (msg) => msg.id === messageId,
            );
            if (!message)
              throw new Error(`Message not found for id: ${messageId}`);
            const selected = message.parts[partIdx];
            if (selected === undefined)
              throw new Error(
                `Part not found for id: ${messageId} at partIdx: ${partIdx}`,
              );
            return selected as UIMessageParts<UI_MESSAGE>[number];
          },
        };
      }),
      { name: 'chat-store' },
    ),
  );
}

// Chat state implementation that bridges Zustand to ChatState interface
class ZustandChatState<UI_MESSAGE extends UIMessage>
  implements ChatState<UI_MESSAGE>
{
  private store: ReturnType<typeof createChatStore<UI_MESSAGE>>;
  private messagesCallbacks = new Set<() => void>();
  private statusCallbacks = new Set<() => void>();
  private errorCallbacks = new Set<() => void>();

  constructor(store: ReturnType<typeof createChatStore<UI_MESSAGE>>) {
    this.store = store;

    // Subscribe to throttled messages changes and notify React callbacks
    this.store.subscribe(
      (state) => state._throttledMessages,
      () => this.messagesCallbacks.forEach((callback) => callback()),
      { equalityFn: (a, b) => a === b },
    );

    this.store.subscribe(
      (state) => state.status,
      () => this.statusCallbacks.forEach((callback) => callback()),
    );

    this.store.subscribe(
      (state) => state.error,
      () => this.errorCallbacks.forEach((callback) => callback()),
    );
  }

  get messages(): UI_MESSAGE[] {
    return this.store.getState().messages;
  }

  set messages(newMessages: UI_MESSAGE[]) {
    this.store.getState().setMessages(newMessages);
  }

  get status(): ChatStatus {
    return this.store.getState().status;
  }

  set status(newStatus: ChatStatus) {
    this.store.getState().setStatus(newStatus);
  }

  get error(): Error | undefined {
    return this.store.getState().error;
  }

  set error(newError: Error | undefined) {
    this.store.getState().setError(newError);
  }

  pushMessage = (message: UI_MESSAGE) => {
    this.store.getState().pushMessage(message);
  };

  popMessage = () => {
    this.store.getState().popMessage();
  };

  replaceMessage = (index: number, message: UI_MESSAGE) => {
    this.store.getState().replaceMessage(index, message);
  };

  snapshot = <T>(value: T): T => structuredClone(value);

  // React subscription methods (using private names like the original)
  '~registerMessagesCallback' = (
    onChange: () => void,
    throttleWaitMs?: number,
  ): (() => void) => {
    const callback = throttleWaitMs
      ? throttle(onChange, throttleWaitMs)
      : onChange;
    this.messagesCallbacks.add(callback);
    return () => {
      this.messagesCallbacks.delete(callback);
    };
  };

  '~registerStatusCallback' = (onChange: () => void): (() => void) => {
    this.statusCallbacks.add(onChange);
    return () => {
      this.statusCallbacks.delete(onChange);
    };
  };

  '~registerErrorCallback' = (onChange: () => void): (() => void) => {
    this.errorCallbacks.add(onChange);
    return () => {
      this.errorCallbacks.delete(onChange);
    };
  };

  // Expose store as public property
  get storeInstance() {
    return this.store;
  }
}

export const chatStore = createChatStore<ChatMessage>();

// Create singleton state instance
export const chatState = new ZustandChatState(chatStore);

// Selector hooks for cleaner API - these use throttled messages
export const useChatMessages = () =>
  chatStore(useShallow((state) => state.getThrottledMessages()));
export const useChatStatus = () => chatStore((state) => state.status);
export const useChatError = () => chatStore((state) => state.error);
export const useChatId = () => chatStore((state) => state.id);

export const useMessageIds = () =>
  chatStore(useShallow((state) => state.getMessageIds()));

export const useMessageById = (messageId: string): ChatMessage =>
  chatStore((state) => {
    const message = state
      .getThrottledMessages()
      .find((msg) => msg.id === messageId);
    if (!message) throw new Error(`Message not found for id: ${messageId}`);
    return message;
  });

// Selector for only the message role; re-renders only when role value changes
export const useMessageRoleById = (messageId: string): ChatMessage['role'] =>
  chatStore((state) => {
    const message = state
      .getThrottledMessages()
      .find((msg) => msg.id === messageId);
    if (!message) throw new Error(`Message not found for id: ${messageId}`);
    return message.role;
  });

export const useMessagePartsById = (messageId: string): ChatMessage['parts'] =>
  chatStore(
    useShallow((state) => {
      const message = state
        .getThrottledMessages()
        .find((msg) => msg.id === messageId);
      if (!message) throw new Error(`Message not found for id: ${messageId}`);
      return message.parts;
    }),
  );

export const useMessageResearchUpdatePartsById = (
  messageId: string,
): Extract<ChatMessage['parts'][number], { type: 'data-researchUpdate' }>[] =>
  chatStore(
    useShallow((state) => {
      const message = state
        .getThrottledMessages()
        .find((msg) => msg.id === messageId);
      if (!message) throw new Error(`Message not found for id: ${messageId}`);
      return message.parts.filter(
        (part) => part.type === 'data-researchUpdate',
      );
    }),
  );

export const useMessageMetadataById = (
  messageId: string,
): ChatMessage['metadata'] =>
  chatStore(
    useShallow((state) => {
      const message = state
        .getThrottledMessages()
        .find((msg) => msg.id === messageId);
      if (!message) throw new Error(`Message not found for id: ${messageId}`);
      return message.metadata;
    }),
  );

// Selector for only the part types of a message
export const useMessagePartTypesById = (
  messageId: string,
): Array<ChatMessage['parts'][number]['type']> =>
  chatStore(useShallow((state) => state.getMessagePartTypesById(messageId)));

// Selector for a specific part by its index within the message parts
export function useMessagePartByPartIdx(
  messageId: string,
  partIdx: number,
): ChatMessage['parts'][number];
export function useMessagePartByPartIdx<
  T extends ChatMessage['parts'][number]['type'],
>(
  messageId: string,
  partIdx: number,
  type: T,
): Extract<ChatMessage['parts'][number], { type: T }>;
export function useMessagePartByPartIdx<
  T extends ChatMessage['parts'][number]['type'],
>(messageId: string, partIdx: number, type?: T) {
  const part = chatStore((state) =>
    state.getMessagePartByIdxCached(messageId, partIdx),
  );

  if (type !== undefined) {
    if (part.type !== type) {
      throw new Error(
        `Part type mismatch for id: ${messageId} at partIdx: ${partIdx}. Expected ${String(
          type,
        )}, got ${String(part.type)}`,
      );
    }
  }

  return part as unknown as T extends ChatMessage['parts'][number]['type']
    ? Extract<ChatMessage['parts'][number], { type: T }>
    : ChatMessage['parts'][number];
}

// Selector for a contiguous range of parts (inclusive of startIdx and endIdx)
export function useMessagePartsByPartRange(
  messageId: string,
  startIdx: number,
  endIdx: number,
): ChatMessage['parts'];
export function useMessagePartsByPartRange<
  T extends ChatMessage['parts'][number]['type'],
>(
  messageId: string,
  startIdx: number,
  endIdx: number,
  type: T,
): Array<Extract<ChatMessage['parts'][number], { type: T }>>;
export function useMessagePartsByPartRange<
  T extends ChatMessage['parts'][number]['type'],
>(messageId: string, startIdx: number, endIdx: number, type?: T) {
  return chatStore(
    useShallow(
      (state) =>
        state.getMessagePartsRangeCached(
          messageId,
          startIdx,
          endIdx,
          type as unknown as string | undefined,
        ) as unknown as ChatMessage['parts'],
    ),
  ) as unknown as T extends ChatMessage['parts'][number]['type']
    ? Array<Extract<ChatMessage['parts'][number], { type: T }>>
    : ChatMessage['parts'];
}

// Internal messages hook for immediate access (no throttling)
export const useInternalMessages = () =>
  chatStore(useShallow((state) => state.getInternalMessages()));

// Action hooks for cleaner API
export const useChatActions = () =>
  chatStore(
    useShallow((state) => ({
      setMessages: state.setMessages,
      pushMessage: state.pushMessage,
      popMessage: state.popMessage,
      replaceMessage: state.replaceMessage,
      setStatus: state.setStatus,
      setError: state.setError,
      setId: state.setId,
      setNewChat: state.setNewChat,
    })),
  );

// Convenience hook for just setMessages
export const useSetMessages = () => chatStore((state) => state.setMessages);

// Markdown blocks selector hook for Response/other renderers
export const useMarkdownBlocksForPart = (messageId: string, partIdx: number) =>
  chatStore(
    useShallow((state) => state.getMarkdownBlocksForPart(messageId, partIdx)),
  );

export const useMarkdownBlockIndexesForPart = (
  messageId: string,
  partIdx: number,
) =>
  chatStore((state) => state.getMarkdownBlockCountForPart(messageId, partIdx));

export const useMarkdownBlockCountForPart = (
  messageId: string,
  partIdx: number,
) =>
  chatStore((state) => state.getMarkdownBlockCountForPart(messageId, partIdx));

export const useMarkdownBlockByIndex = (
  messageId: string,
  partIdx: number,
  blockIdx: number,
) =>
  chatStore((state) =>
    state.getMarkdownBlockByIndex(messageId, partIdx, blockIdx),
  );

// Selector for sendMessage helper
export const useSendMessage = () =>
  chatStore((state) => state.currentChatHelpers?.sendMessage);

export class ZustandChat<
  UI_MESSAGE extends UIMessage,
> extends AbstractChat<UI_MESSAGE> {
  private zustandState: ZustandChatState<UI_MESSAGE>;
  public store: ReturnType<typeof createChatStore<UI_MESSAGE>>;

  constructor({
    messages,
    state,
    id,
    ...init
  }: ChatInit<UI_MESSAGE> & {
    state: ZustandChatState<UI_MESSAGE>;
    id?: string;
  }) {
    super({ ...init, id, state });
    this.zustandState = state;
    this.store = state.storeInstance;
    console.log(
      'building zustand chat with id',
      id,
      'store id',
      this.store.getState().id,
    );
  }

  // Expose the subscription methods for useChat
  '~registerMessagesCallback' = (
    onChange: () => void,
    throttleWaitMs?: number,
  ): (() => void) =>
    this.zustandState['~registerMessagesCallback'](onChange, throttleWaitMs);

  '~registerStatusCallback' = (onChange: () => void): (() => void) =>
    this.zustandState['~registerStatusCallback'](onChange);

  '~registerErrorCallback' = (onChange: () => void): (() => void) =>
    this.zustandState['~registerErrorCallback'](onChange);
}
