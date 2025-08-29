import { Maximize2, Minimize2 } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
// Type-only imports
import type { ResearchUpdate } from '@/lib/ai/tools/research-updates-schema';

import { ResearchTasks } from './research-tasks';
import { ResearchTask } from './research-task';
import { UpdateTitle } from '@/components/update-title';

// Add the updateName mapping (consider moving to a shared util later)
const updateName = {
  web: 'Web Search',
  started: 'Started',
  completed: 'Completed',
  thoughts: 'Thoughts',
  writing: 'Writing',
} as const;

export const ResearchProgress = ({
  updates,
  totalExpectedSteps,
  isComplete,
}: {
  updates: ResearchUpdate[];
  totalExpectedSteps: number;
  isComplete: boolean;
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const lastUpdate = updates.length > 0 ? updates[updates.length - 1] : null;

  const searchCount = React.useMemo(() => {
    return updates.filter((u) => u.type === 'web').length;
  }, [updates]);

  const sourceCount = React.useMemo(() => {
    return updates
      .filter((u) => u.type === 'web')
      .reduce((acc, u) => acc + (u.results?.length || 0), 0);
  }, [updates]);

  // TODO: First update is not showing
  const lastUpdateTitle = !lastUpdate
    ? 'Researching'
    : isComplete
      ? `Research Complete`
      : lastUpdate.title || updateName[lastUpdate.type];

  const timeSpent = React.useMemo(() => {
    if (isComplete) {
      const progressUpdates = updates.filter(
        (u) => u.type === 'started' || u.type === 'completed',
      );
      const completedUpdate = progressUpdates.find(
        (u) => u.type === 'completed',
      );

      return completedUpdate?.timestamp
        ? Math.floor(
            (completedUpdate.timestamp - progressUpdates[0].timestamp) / 1000,
          )
        : 0;
    }
    return 0;
  }, [updates, isComplete]);

  return (
    <div className="border rounded-lg p-1 ">
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'flex items-center justify-between py-2 px-3 rounded-lg w-full cursor-pointer',
          'hover:bg-accent hover:text-accent-foreground transition-colors',
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsExpanded(!isExpanded);
            e.preventDefault();
          }
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex flex-col sm:flex-row  sm:items-center gap-2">
            {isComplete ? (
              <span className="text-xs text-muted-foreground">{`Researched for ${timeSpent} seconds, ${searchCount} searches, ${sourceCount} sources`}</span>
            ) : (
              <UpdateTitle title={lastUpdateTitle} isRunning={!isComplete} />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <Minimize2
              className="size-4 text-muted-foreground shrink-0"
              aria-hidden="true"
            />
          ) : (
            <Maximize2
              className="size-4 text-muted-foreground shrink-0"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {isExpanded ? (
        <div className="pt-2 pb-1 px-1">
          <ResearchTasks updates={updates} />
        </div>
      ) : (
        lastUpdate &&
        !isComplete && (
          <div className="px-4 pt-1 pb-3">
            {/* We only show the running step in this component */}
            <ResearchTask update={lastUpdate} minimal={true} isRunning={true} />
          </div>
        )
      )}
    </div>
  );
};
