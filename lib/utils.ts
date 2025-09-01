import type { FileUIPart, ModelMessage, TextPart } from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { Document } from '@/lib/db/schema';
import type { Attachment, ChatMessage } from './ai/types';
import { ChatSDKError, type ErrorCode } from './ai/errors';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      // Try to read a structured JSON error; fall back to text if not JSON
      const contentType = response.headers.get('content-type') || '';
      let code: ErrorCode | null = null;
      let cause: string | undefined;
      if (contentType.includes('application/json')) {
        try {
          const body = await response.json();
          if (body && typeof body === 'object') {
            code = (body.code as ErrorCode) ?? null;
            cause = typeof body.cause === 'string' ? body.cause : undefined;
          }
        } catch {
          // ignore JSON parse failure, fall through to text
        }
      }
      if (!code) {
        // Map HTTP status to a sensible default error code on the chat surface
        const status = response.status;
        if (status === 400) code = 'bad_request:chat';
        else if (status === 401) code = 'unauthorized:chat';
        else if (status === 403) code = 'forbidden:chat';
        else if (status === 404) code = 'not_found:chat';
        else if (status === 429) code = 'rate_limit:chat';
        else code = 'bad_request:chat';
        if (!cause) {
          try {
            const text = await response.text();
            cause = text?.slice(0, 200) || undefined;
          } catch {
            // ignore
          }
        }
      }
      throw new ChatSDKError(code as ErrorCode, cause);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatSDKError('offline:chat');
    }

    throw error;
  }
}

export function findLastArtifact(
  messages: Array<ChatMessage>,
): { messageIndex: number; toolCallId: string } | null {
  const allArtifacts: Array<{ messageIndex: number; toolCallId: string }> = [];

  messages.forEach((msg, messageIndex) => {
    msg.parts?.forEach((part) => {
      if (
        part.type === 'tool-createDocument' ||
        part.type === 'tool-updateDocument' ||
        part.type === 'tool-deepResearch'
      ) {
        if (part.state === 'output-available') {
          allArtifacts.push({
            messageIndex,
            toolCallId: part.toolCallId,
          });
        }
      }
    });
  });

  return allArtifacts[allArtifacts.length - 1] || null;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    const error = new Error(
      'An error occurred while fetching the data.',
    ) as ApplicationError;

    try {
      error.info = contentType.includes('application/json')
        ? await res.json()
        : await res.text();
    } catch {
      error.info = '' as unknown as string;
    }
    error.status = res.status;

    throw error;
  }

  try {
    return contentType.includes('application/json') ? await res.json() : await res.text();
  } catch (e) {
    // As a last resort, return empty JSON to avoid SyntaxError in consumers
    return {} as any;
  }
};

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getMostRecentUserMessage(messages: Array<ChatMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ChatMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

export function getLanguageFromFileName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  const extensionToLanguage: Record<string, string> = {
    // JavaScript/TypeScript
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    mjs: 'javascript',
    cjs: 'javascript',

    // Python
    py: 'python',
    pyw: 'python',
    pyi: 'python',

    // Web
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'css',
    sass: 'css',
    less: 'css',

    // Data formats
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',

    // Shell
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    fish: 'shell',

    // Other languages
    sql: 'sql',
    md: 'markdown',
    mdx: 'markdown',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    swift: 'swift',
    kt: 'kotlin',
    r: 'r',
    R: 'r',
  };

  return extensionToLanguage[extension] || 'python'; // Default to python
}

export function getAttachmentsFromMessage(message: ChatMessage): Attachment[] {
  return message.parts
    .filter<FileUIPart>((part) => part.type === 'file')
    .map((part) => ({
      name: part.filename || '',
      url: part.url,
      contentType: part.mediaType,
    }));
}

export function getTextContentFromMessage(message: ChatMessage): string {
  return message.parts
    .filter<TextPart>((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function getTextContentFromModelMessage(message: ModelMessage): string {
  const content = message.content;

  if (typeof content === 'string') {
    return content;
  }

  return content
    .map((part) => {
      if (part.type === 'text') {
        return part.text;
      }
      return '';
    })
    .join('\n');
}
