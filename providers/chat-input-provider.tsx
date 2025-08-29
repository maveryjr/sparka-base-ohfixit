'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
  useRef,
} from 'react';
import type { Attachment, UiToolName } from '@/lib/ai/types';
import { useDefaultModel, useModelChange } from './default-model-provider';
import { getModelDefinition } from '@/lib/ai/all-models';
import type { LexicalChatInputRef } from '@/components/lexical-chat-input';
import type { ModelId } from '@/lib/ai/model-id';

interface ChatInputContextType {
  editorRef: React.RefObject<LexicalChatInputRef>;
  selectedTool: UiToolName | null;
  setSelectedTool: Dispatch<SetStateAction<UiToolName | null>>;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  selectedModelId: ModelId;
  handleModelChange: (modelId: ModelId) => Promise<void>;
  getInputValue: () => string;
  handleInputChange: (value: string) => void;
  getInitialInput: () => string;
  isEmpty: boolean;
  handleSubmit: (submitFn: () => void, isEditMode?: boolean) => void;
}

const ChatInputContext = createContext<ChatInputContextType | undefined>(
  undefined,
);

interface ChatInputProviderProps {
  children: ReactNode;
  initialInput?: string;
  initialTool?: UiToolName | null;
  initialAttachments?: Array<Attachment>;
  overrideModelId?: ModelId; // For message editing where we want to use the original model
  localStorageEnabled?: boolean;
}

export function ChatInputProvider({
  children,
  initialInput = '',
  initialTool = null,
  initialAttachments = [],
  overrideModelId,
  localStorageEnabled = true,
}: ChatInputProviderProps) {
  // Helper functions for localStorage access without state
  const getLocalStorageInput = useCallback(() => {
    if (!localStorageEnabled) return '';
    try {
      return localStorage.getItem('input') || '';
    } catch {
      return '';
    }
  }, [localStorageEnabled]);

  const setLocalStorageInput = useCallback(
    (value: string) => {
      if (!localStorageEnabled) return;
      try {
        localStorage.setItem('input', value);
      } catch {
        // Silently fail if localStorage is not available
      }
    },
    [localStorageEnabled],
  );

  const defaultModel = useDefaultModel();
  const changeModel = useModelChange();

  // Initialize selectedModelId from override or default model
  const [selectedModelId, setSelectedModelId] = useState<ModelId>(
    overrideModelId || defaultModel,
  );

  const [selectedTool, setSelectedTool] = useState<UiToolName | null>(
    initialTool,
  );
  const [attachments, setAttachments] =
    useState<Array<Attachment>>(initialAttachments);

  // Track if input is empty for reactive UI updates
  const [isEmpty, setIsEmpty] = useState<boolean>(() => {
    const initial = initialInput || getLocalStorageInput();
    return initial.trim().length === 0;
  });

  // Create ref for lexical editor
  const editorRef = useRef<LexicalChatInputRef>(null);

  // Get the initial input value from localStorage if enabled and no initial input provided
  const getInitialInput = useCallback(() => {
    if (!localStorageEnabled) return initialInput;
    return initialInput || getLocalStorageInput();
  }, [initialInput, getLocalStorageInput, localStorageEnabled]);

  const handleModelChange = useCallback(
    async (modelId: ModelId) => {
      const modelDef = getModelDefinition(modelId);
      const hasReasoning = modelDef.features?.reasoning === true;
      const hasUnspecifiedFeatures = !modelDef.features;

      // If switching to a model with unspecified features, disable all tools
      if (hasUnspecifiedFeatures && selectedTool !== null) {
        setSelectedTool(null);
      }
      // If switching to a reasoning model and deep research is selected, disable it
      else if (hasReasoning && selectedTool === 'deepResearch') {
        setSelectedTool(null);
      }

      // Update local state immediately
      setSelectedModelId(modelId);

      // Update global default model (which handles cookie persistence)
      await changeModel(modelId);
    },
    [selectedTool, setSelectedTool, changeModel],
  );

  const clearInput = useCallback(() => {
    editorRef.current?.clear();
    setLocalStorageInput('');
    setIsEmpty(true);
  }, [setLocalStorageInput]);

  const resetData = useCallback(() => {
    setSelectedTool(null);
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const getInputValue = useCallback(() => {
    return editorRef.current?.getValue() || '';
  }, []);

  // Save to localStorage when input changes (will be called by the lexical editor)
  const handleInputChange = useCallback(
    (value: string) => {
      if (localStorageEnabled) {
        setLocalStorageInput(value);
      }
      // Update isEmpty state reactively
      setIsEmpty(value.trim().length === 0);
    },
    [setLocalStorageInput, localStorageEnabled],
  );

  // Unified submit handler that ensures consistent behavior for both Enter key and send button
  const handleSubmit = useCallback(
    (submitFn: () => void, isEditMode = false) => {
      // Call the actual submission function
      submitFn();

      // Clear attachments for all submissions
      clearAttachments();

      // Clear input only when not in edit mode
      if (!isEditMode) {
        clearInput();
      }

      // deepResearch stays active until the research process completes (handled via DataStreamHandler)
      if (selectedTool !== 'deepResearch') {
        resetData();
      }
    },
    [clearAttachments, clearInput, selectedTool, resetData],
  );

  return (
    <ChatInputContext.Provider
      value={{
        editorRef,
        selectedTool,
        setSelectedTool,
        attachments,
        setAttachments,
        selectedModelId,
        handleModelChange,
        getInputValue,
        handleInputChange,
        getInitialInput,
        isEmpty,
        handleSubmit,
      }}
    >
      {children}
    </ChatInputContext.Provider>
  );
}

export function useChatInput() {
  const context = useContext(ChatInputContext);
  if (context === undefined) {
    throw new Error('useChatInput must be used within a ChatInputProvider');
  }
  return context;
}
