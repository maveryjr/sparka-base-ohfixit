import type { ResearchUpdate } from '@/lib/ai/tools/research-updates-schema';
import React, { type ReactNode } from 'react';
import { ResearchTask } from './research-task';
import { FileText, Sparkles, Dot, Pencil, CircleCheck } from 'lucide-react';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export const ResearchTasks = ({ updates }: { updates: ResearchUpdate[] }) => {
  return (
    <div className="relative">
      {updates.map((update, index) => {
        return (
          <StepWrapper
            key={`${update.type}-${index}`}
            update={update}
            isLast={index === updates.length - 1}
          >
            <ResearchTask
              update={update}
              minimal={false}
              isRunning={
                (update.type === 'web' && update.status === 'running') ||
                (index === updates.length - 1 && update.type !== 'completed')
              }
            />
          </StepWrapper>
        );
      })}
    </div>
  );
};

export type StepWrapperProps = {
  update: ResearchUpdate;
  children: ReactNode;
  isLast: boolean;
};

export const StepWrapper = ({ update, children, isLast }: StepWrapperProps) => {
  return (
    <div className="flex w-full flex-row items-stretch justify-start gap-2">
      <div className="flex min-h-full shrink-0 flex-col items-center justify-start px-2">
        <div className="bg-border/50 h-1 shrink-0" />
        <div className="py-0.5 z-10 bg-background">
          <StepTypeIcon update={update} />
        </div>
        <motion.div
          className={cn(
            'border-border min-h-full w-px flex-1 border-l border-dashed',
            isLast && 'hidden',
          )}
          initial={{ height: 0 }}
          animate={{ height: '100%' }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <motion.div
        className="flex w-full flex-1 flex-col gap-4 overflow-hidden pt-1 pb-2 pr-2"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </div>
  );
};

const icons: Record<ResearchUpdate['type'], React.ElementType> = {
  web: FileText,
  started: Dot,
  completed: CircleCheck,
  thoughts: Sparkles,
  writing: Pencil,
} as const;

export const StepTypeIcon = ({ update }: { update: ResearchUpdate }) => {
  const Icon = icons[update.type];
  return <Icon className="w-4 h-4 text-muted-foreground" />;
};
