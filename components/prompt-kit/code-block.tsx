'use client';

import { cn } from '@/lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  className?: string;
  children: React.ReactNode;
}

interface CodeBlockGroupProps {
  className?: string;
  children: React.ReactNode;
}

interface CodeBlockCodeProps {
  code: string;
  language: string;
}

export function CodeBlock({ className, children }: CodeBlockProps) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-lg border', className)}
    >
      {children}
    </div>
  );
}

export function CodeBlockGroup({ className, children }: CodeBlockGroupProps) {
  return <div className={cn('bg-muted border-b', className)}>{children}</div>;
}

export function CodeBlockCode({ code, language }: CodeBlockCodeProps) {
  return (
    <div className="overflow-x-auto">
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          backgroundColor: 'transparent',
          fontSize: '0.875rem',
        }}
        codeTagProps={{
          style: {
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
