'use client';

// Hooks that are used to mutate the chat store
// They use local storage functions from '@/lib/utils/anonymous-chat-storage' for anonymous users
// They use tRPC mutations for authenticated users

import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCallback, useMemo } from 'react';

import { useTRPC } from '@/trpc/react';
import {
  dbMessageToChatMessage,
  chatMessageToDbMessage,
} from '@/lib/message-conversion';
import { useChatId } from '@/providers/chat-id-provider';
import type { UIChat } from '@/lib/types/uiChat';
import type { Document } from '@/lib/db/schema';
import {
  loadLocalAnonymousMessagesByChatId,
  saveAnonymousMessage,
  deleteAnonymousChat,
  renameAnonymousChat,
  saveAnonymousChatToStorage,
  deleteAnonymousTrailingMessages,
  cloneAnonymousChat,
  loadAnonymousDocumentsByDocumentId,
  saveAnonymousDocument,
  loadAnonymousChatsFromStorage,
  loadAnonymousChatById,
  pinAnonymousChat,
} from '@/lib/utils/anonymous-chat-storage';
import { getAnonymousSession } from '@/lib/anonymous-session-client';
import { generateUUID, getTextContentFromMessage } from '@/lib/utils';
import type { ChatMessage } from '@/lib/ai/types';

export function useSaveChat() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const generateTitleMutation = useMutation(
    trpc.chat.generateTitle.mutationOptions({
      onError: (error) => {
        console.error('Failed to generate title:', error);
      },
    }),
  );

  const saveChatMutation = useMutation({
    mutationFn: async ({
      chatId,
      message,
    }: { chatId: string; message: string }) => {
      // Save chat with temporary title first
      const tempChat = {
        id: chatId,
        title: 'Untitled',
        createdAt: new Date(),
        updatedAt: new Date(),
        visibility: 'private' as const,
      };

      await saveAnonymousChatToStorage({ ...tempChat, isPinned: false });
      return { tempChat, message };
    },
    onSuccess: async ({ tempChat, message }) => {
      // Generate proper title asynchronously after successful save
      const data = await generateTitleMutation.mutateAsync({ message });
      if (data?.title) {
        // Update the chat with the generated title
        await saveAnonymousChatToStorage({
          ...tempChat,
          title: data.title,
          isPinned: false,
        });

        // Invalidate chats to refresh the UI
        queryClient.invalidateQueries({
          queryKey: trpc.chat.getAllChats.queryKey(),
        });
      }
    },
    onError: (error) => {
      console.error('Failed to save chat:', error);
      toast.error('Failed to save chat');
    },
  });

  const saveChat = useCallback(
    (chatId: string, message: string, isAuthenticated: boolean) => {
      // Skip if authenticated (API handles it)
      if (isAuthenticated) {
        return;
      }

      return saveChatMutation.mutate({ chatId, message });
    },
    [saveChatMutation],
  );

  return {
    saveChat,
    isSaving: saveChatMutation.isPending,
    isGeneratingTitle: generateTitleMutation.isPending,
  };
}

export function useMessagesQuery() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();
  const { id: chatId, type } = useChatId();

  // Memoize the tRPC query options for messages by chat ID
  const getMessagesByChatIdQueryOptions = useMemo(() => {
    const options = trpc.chat.getChatMessages.queryOptions({
      chatId: chatId || '',
    });
    if (isAuthenticated) {
      return {
        ...options,
        enabled: !!chatId && type === 'chat',
      };
    } else {
      return {
        queryKey: options.queryKey, // Include chatId in query key for proper caching
        queryFn: async () => {
          // Load from localStorage for anonymous users
          try {
            const restoredMessages = await loadLocalAnonymousMessagesByChatId(
              chatId || '',
            );
            return restoredMessages.map(dbMessageToChatMessage);
          } catch (error) {
            console.error('Error loading anonymous messages:', error);
            return [];
          }
        },
        enabled: !!chatId,
      };
    }
  }, [trpc.chat.getChatMessages, isAuthenticated, chatId, type]);

  // Query for messages by chat ID (only when chatId is available)
  return useQuery(getMessagesByChatIdQueryOptions);
}

interface ChatMutationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}
export function useDeleteChat() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const getAllChatsQueryKey = useMemo(
    () => trpc.chat.getAllChats.queryKey(),
    [trpc.chat.getAllChats],
  );

  const deleteChat = useCallback(
    async (chatId: string, options?: ChatMutationOptions) => {
      try {
        if (isAuthenticated) {
          const mutation = trpc.chat.deleteChat.mutationOptions();
          await mutation.mutationFn?.({ chatId });
        } else {
          await deleteAnonymousChat(chatId);
        }
        options?.onSuccess?.();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error : new Error('Unknown error');
        options?.onError?.(errorMessage);
        throw errorMessage;
      } finally {
        queryClient.invalidateQueries({
          queryKey: getAllChatsQueryKey,
        });
      }
    },
    [isAuthenticated, queryClient, getAllChatsQueryKey, trpc.chat.deleteChat],
  );

  return { deleteChat };
}

export function useRenameChat() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const getAllChatsQueryKey = useMemo(
    () => trpc.chat.getAllChats.queryKey(),
    [trpc.chat.getAllChats],
  );

  const renameMutation = useMutation({
    mutationFn: isAuthenticated
      ? trpc.chat.renameChat.mutationOptions().mutationFn
      : async ({ chatId, title }: { chatId: string; title: string }) => {
          await renameAnonymousChat(chatId, title);
        },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: getAllChatsQueryKey,
      });

      const previousChats = queryClient.getQueryData(getAllChatsQueryKey);

      queryClient.setQueryData(
        getAllChatsQueryKey,
        (old: UIChat[] | undefined) => {
          if (!old) return old;
          return old.map((c) =>
            c.id === variables.chatId ? { ...c, title: variables.title } : c,
          );
        },
      );

      return { previousChats };
    },
    onError: (err, variables, context) => {
      if (context?.previousChats) {
        queryClient.setQueryData(getAllChatsQueryKey, context.previousChats);
      }
      toast.error('Failed to rename chat');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getAllChatsQueryKey,
      });
    },
  });

  return renameMutation;
}

export function usePinChat() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const getAllChatsQueryKey = useMemo(
    () => trpc.chat.getAllChats.queryKey(),
    [trpc.chat.getAllChats],
  );

  const pinMutation = useMutation({
    mutationFn: isAuthenticated
      ? trpc.chat.setIsPinned.mutationOptions().mutationFn
      : async ({ chatId, isPinned }: { chatId: string; isPinned: boolean }) => {
          await pinAnonymousChat(chatId, isPinned);
          return { success: true };
        },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: getAllChatsQueryKey,
      });

      const previousChats = queryClient.getQueryData(getAllChatsQueryKey);

      queryClient.setQueryData(
        getAllChatsQueryKey,
        (old: UIChat[] | undefined) => {
          if (!old) return old;
          return old.map((c) =>
            c.id === variables.chatId
              ? { ...c, isPinned: variables.isPinned }
              : c,
          );
        },
      );

      return { previousChats };
    },
    onError: (err, variables, context) => {
      if (context?.previousChats) {
        queryClient.setQueryData(getAllChatsQueryKey, context.previousChats);
      }
      toast.error('Failed to pin chat');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getAllChatsQueryKey,
      });
    },
  });

  return pinMutation;
}

export function useDeleteTrailingMessages() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteTrailingMutationOptions = useMemo(
    () => trpc.chat.deleteTrailingMessages.mutationOptions(),
    [trpc.chat.deleteTrailingMessages],
  );

  const invalidateMessagesByChatId = useCallback(
    (chatId: string) => {
      queryClient.invalidateQueries({
        queryKey: trpc.chat.getChatMessages.queryKey({ chatId }),
      });
    },
    [queryClient, trpc.chat.getChatMessages],
  );

  // Delete trailing messages mutation
  const deleteTrailingMessagesMutation = useMutation({
    mutationFn: isAuthenticated
      ? async ({ messageId, chatId }: { messageId: string; chatId: string }) =>
          await deleteTrailingMutationOptions?.mutationFn?.({
            messageId,
          })
      : async ({
          messageId,
          chatId,
        }: { messageId: string; chatId: string }) => {
          await deleteAnonymousTrailingMessages(messageId);
        },
    onMutate: async (variables) => {
      const { messageId, chatId } = variables;
      const messagesQueryKey = trpc.chat.getChatMessages.queryKey({
        chatId,
      });

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: messagesQueryKey });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(messagesQueryKey);

      // Optimistically update cache - keep only messages before the messageId
      queryClient.setQueryData(messagesQueryKey, (old) => {
        if (!old) return old;
        const messageIndex = old.findIndex((msg) => msg.id === messageId);
        if (messageIndex === -1) return old;
        return old.slice(0, messageIndex);
      });

      return { previousMessages, messagesQueryKey };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          context.messagesQueryKey,
          context.previousMessages,
        );
      }
      toast.error('Failed to delete messages');
    },
    onSuccess: (_, variables) => {
      invalidateMessagesByChatId(variables.chatId);
      toast.success('Messages deleted');
    },
  });

  return deleteTrailingMessagesMutation;
}

export function useCloneChat() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const getAllChatsQueryKey = useMemo(
    () => trpc.chat.getAllChats.queryKey(),
    [trpc.chat.getAllChats],
  );

  const copyPublicChatMutationOptions = useMemo(
    () => trpc.chat.cloneSharedChat.mutationOptions(),
    [trpc.chat.cloneSharedChat],
  );

  return useMutation({
    mutationFn: async ({
      chatId,
    }: {
      chatId: string;
    }) => {
      if (isAuthenticated) {
        if (copyPublicChatMutationOptions?.mutationFn) {
          return await copyPublicChatMutationOptions.mutationFn({ chatId });
        } else {
          throw new Error(
            'Copy public chat mutation function is not available',
          );
        }
      } else {
        // Get original chat and messages from cache
        const originalChat = queryClient.getQueryData(
          trpc.chat.getPublicChat.queryKey({ chatId }),
        );
        const originalMessages = queryClient.getQueryData(
          trpc.chat.getPublicChatMessages.queryKey({ chatId }),
        );

        if (!originalChat || !originalMessages) {
          throw new Error('Original chat data not found in cache');
        }

        const originalMessagesIds = originalMessages.map(
          (message: any) => message.id,
        );

        // Get all getPublicDocuments queries from cache and filter documents by messageId
        const allDocumentQueries = queryClient.getQueriesData({
          queryKey: trpc.document.getPublicDocuments
            .queryKey({ id: '' })
            .slice(0, -1), // Remove the specific id filter to match all
        });

        const originalDocuments = allDocumentQueries
          .flatMap(([_, data]) => data || [])
          .filter((document: any) =>
            originalMessagesIds.includes(document.messageId),
          );
        console.log(originalMessages);
        console.log(originalDocuments);

        const newId = generateUUID();
        await cloneAnonymousChat(
          originalMessages.map((message) =>
            chatMessageToDbMessage(message, chatId),
          ),
          originalChat,
          originalDocuments as Document[],
          newId,
        );
        return { chatId: newId };
      }
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: getAllChatsQueryKey,
      });
    },
    onError: (error) => {
      console.error('Failed to copy chat:', error);
    },
  });
}

export function useSaveMessageMutation() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { saveChat: saveChatWithTitle } = useSaveChat();

  return useMutation({
    mutationFn: async ({
      message,
      chatId,
    }: {
      message: ChatMessage;
      chatId: string;
    }) => {
      const parentMessageId = message.metadata?.parentMessageId || null;

      if (!isAuthenticated) {
        // Save message for anonymous users when completed (not partial)

        await saveAnonymousMessage(chatMessageToDbMessage(message, chatId));
      }
      // For authenticated users, the API handles saving
    },
    onMutate: async ({ message, chatId }) => {
      // Get the query key for messages
      const messagesQueryKey = trpc.chat.getChatMessages.queryKey({
        chatId: chatId,
      });

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: messagesQueryKey });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(messagesQueryKey);

      // Optimistically update cache
      queryClient.setQueryData(messagesQueryKey, (old) => {
        if (!old) return [message];
        return [...old, message];
      });

      return { previousMessages, messagesQueryKey };
    },
    onError: (err, message, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          context.messagesQueryKey,
          context.previousMessages,
        );
      }
      console.error('Failed to save message:', err);
      toast.error('Failed to save message');
    },
    onSuccess: (data, { message, chatId }, { previousMessages }) => {
      if (isAuthenticated) {
        // Update credits
        if (message.role === 'assistant') {
          queryClient.invalidateQueries({
            queryKey: trpc.credits.getAvailableCredits.queryKey(),
          });
        }
      } else {
        // Check if this this the fist message in the cache
        const messagesQueryKey = trpc.chat.getChatMessages.queryKey({
          chatId: chatId,
        });
        const messages = queryClient.getQueryData(messagesQueryKey);
        if (messages?.length === 1) {
          saveChatWithTitle(
            chatId,
            getTextContentFromMessage(message),
            isAuthenticated,
          );
        }
        // Update credits
      }
      if (message.role === 'assistant') {
        // Get updated list of chats (to sort by updated at)
        queryClient.invalidateQueries({
          queryKey: trpc.chat.getAllChats.queryKey(),
        });
      }
    },
  });
}

export function useSetVisibility() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const getAllChatsQueryKey = useMemo(
    () => trpc.chat.getAllChats.queryKey(),
    [trpc.chat.getAllChats],
  );

  return useMutation({
    mutationFn: isAuthenticated
      ? trpc.chat.setVisibility.mutationOptions().mutationFn
      : async ({
          chatId,
          visibility,
        }: { chatId: string; visibility: 'private' | 'public' }) => {
          throw new Error('Not implemented');
        },
    onError: (err) => {
      toast.error('Failed to update chat visibility');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getAllChatsQueryKey,
      });
    },
    onSuccess: (_, variables) => {
      const message =
        variables.visibility === 'public'
          ? 'Chat is now public - anyone with the link can access it'
          : 'Chat is now private - only you can access it';

      toast.success(message);
    },
  });
}

export function useSaveDocument(
  documentId: string,
  messageId: string,
  options?: {
    onSettled?: (result: any, error: any, params: any) => void;
  },
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const isAuthenticated = !!session?.user;
  const anonymousSession = getAnonymousSession();

  return useMutation({
    mutationFn: isAuthenticated
      ? trpc.document.saveDocument.mutationOptions().mutationFn
      : async (newDocument: any) => {
          const documentToSave = {
            id: newDocument.id,
            createdAt: new Date(),
            title: newDocument.title,
            content: newDocument.content,
            kind: newDocument.kind,
            userId: anonymousSession?.id || '',
            messageId: messageId,
          };
          await saveAnonymousDocument(documentToSave);
          return { success: true };
        },
    onMutate: async (newDocument) => {
      const queryKey = trpc.document.getDocuments.queryKey({
        id: newDocument.id,
      });

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousDocuments =
        queryClient.getQueryData<Document[]>(queryKey) ?? [];

      // Optimistically add the new document to the list
      const optimisticData = [
        ...previousDocuments,
        {
          id: newDocument.id,
          createdAt: new Date(),
          title: newDocument.title,
          content: newDocument.content,
          kind: newDocument.kind,
          userId: isAuthenticated ? userId || '' : anonymousSession?.id || '', // Ensure always string
          messageId: messageId,
        },
      ];

      queryClient.setQueryData(queryKey, optimisticData);

      return { previousDocuments, newDocument };
    },
    onError: (err, newDocument, context) => {
      // Rollback to previous documents on error
      if (context?.previousDocuments) {
        const queryKey = trpc.document.getDocuments.queryKey({
          id: newDocument.id,
        });
        queryClient.setQueryData(queryKey, context.previousDocuments);
      }
    },
    onSettled: (result, error, params) => {
      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: trpc.document.getDocuments.queryKey({ id: params.id }),
      });

      // Call custom onSettled if provided
      options?.onSettled?.(result, error, params);
    },
  });
}

export function useDocuments(id: string, disable: boolean) {
  const trpc = useTRPC();
  const { type } = useChatId();
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const documentsQueryOptions = useMemo(() => {
    if (type === 'shared') {
      return trpc.document.getPublicDocuments.queryOptions(
        { id: id },
        {
          enabled: !disable && !!id,
        },
      );
    } else {
      if (isAuthenticated) {
        return trpc.document.getDocuments.queryOptions(
          { id: id },
          {
            enabled: !disable && !!id,
          },
        );
      } else {
        return {
          queryKey: trpc.document.getDocuments.queryKey({ id: id }),
          queryFn: async () => {
            const documents = await loadAnonymousDocumentsByDocumentId(
              id || '',
            );
            return documents;
          },
          enabled: !disable && !!id,
        };
      }
    }
  }, [
    trpc.document.getDocuments,
    trpc.document.getPublicDocuments,
    id,
    disable,
    type,
    isAuthenticated,
  ]);

  return useQuery(documentsQueryOptions);
}

export function useGetAllChats(limit?: number) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();
  // Memoize the tRPC query options to prevent recreation
  const getAllChatsQueryOptions = useMemo(() => {
    const options = trpc.chat.getAllChats.queryOptions();
    if (isAuthenticated) {
      return {
        ...options,
        select: limit ? (data: UIChat[]) => data.slice(0, limit) : undefined,
      };
    } else {
      return {
        queryKey: options.queryKey,
        select: limit ? (data: UIChat[]) => data.slice(0, limit) : undefined,
        queryFn: async () => {
          const chats = await loadAnonymousChatsFromStorage();
          return chats.map((chat: any) => ({
            id: chat.id,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt || chat.createdAt,
            title: chat.title,
            visibility: chat.visibility,
            userId: '',
            isPinned: chat.isPinned || false,
          }));
        },
      };
    }
  }, [trpc.chat.getAllChats, isAuthenticated, limit]);

  // Combined query for both authenticated and anonymous chats
  return useQuery(getAllChatsQueryOptions);
}

export function useGetChatById(chatId: string) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();

  const getChatByIdQueryOptions = useMemo(() => {
    const options = trpc.chat.getChatById.queryOptions({ chatId });
    if (isAuthenticated) {
      return {
        ...options,
        enabled: !!chatId,
      };
    } else {
      return {
        queryKey: trpc.chat.getChatById.queryKey({ chatId }),
        queryFn: async (): Promise<UIChat> => {
          const chat = await loadAnonymousChatById(chatId);
          // TODO: Change for trpc error
          if (!chat) throw new Error('Chat not found');

          return {
            id: chat.id,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt || chat.createdAt,
            title: chat.title,
            visibility: chat.visibility,
            userId: '',
            isPinned: chat.isPinned || false,
          } satisfies UIChat;
        },
        enabled: !!chatId,
      };
    }
  }, [trpc.chat.getChatById, isAuthenticated, chatId]);

  return useQuery(getChatByIdQueryOptions);
}

export function useGetCredits() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();

  const queryOptions = useMemo(() => {
    if (isAuthenticated) {
      return trpc.credits.getAvailableCredits.queryOptions();
    } else {
      return {
        queryKey: trpc.credits.getAvailableCredits.queryKey(),
        queryFn: async () => {
          const anonymousSession = getAnonymousSession();
          return {
            totalCredits: anonymousSession?.remainingCredits ?? 0,
            availableCredits: anonymousSession?.remainingCredits ?? 0,
            reservedCredits: 0,
          };
        },
      };
    }
  }, [isAuthenticated, trpc.credits.getAvailableCredits]);

  const { data: creditsData, isLoading: isLoadingCredits } =
    useQuery(queryOptions);

  return {
    credits: creditsData?.totalCredits,
    isLoadingCredits,
  };
}
