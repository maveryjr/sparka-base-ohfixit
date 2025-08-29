import React, {
  type Dispatch,
  type SetStateAction,
  useState,
  createElement,
} from 'react';
import { Settings2, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';
import { getModelDefinition } from '@/lib/ai/all-models';
import { LoginPrompt } from './upgrade-cta/login-prompt';
import { toolDefinitions, enabledTools } from './chat-features-definitions';
import type { UiToolName } from '@/lib/ai/types';

export function ResponsiveTools({
  tools,
  setTools,
  selectedModelId,
}: {
  tools: UiToolName | null;
  setTools: Dispatch<SetStateAction<UiToolName | null>>;
  selectedModelId: string;
}) {
  const { data: session } = useSession();
  const isAnonymous = !session?.user;
  const [showLoginPopover, setShowLoginPopover] = useState(false);

  const { hasReasoningModel, hasUnspecifiedFeatures } = (() => {
    try {
      const modelDef = getModelDefinition(selectedModelId as any);
      return {
        hasReasoningModel: modelDef.features?.reasoning === true,
        hasUnspecifiedFeatures: !modelDef.features,
      };
    } catch {
      return {
        hasReasoningModel: false,
        hasUnspecifiedFeatures: false,
      };
    }
  })();

  const activeTool = tools;

  const setTool = (tool: UiToolName | null) => {
    if (tool === 'deepResearch' && hasReasoningModel) {
      return;
    }

    if (hasUnspecifiedFeatures && tool !== null) {
      return;
    }

    if (isAnonymous && tool !== null) {
      setShowLoginPopover(true);
      return;
    }

    setTools(tool);
  };

  return (
    <div className="flex items-center gap-1 @[400px]:gap-2 ">
      {isAnonymous ? (
        <Popover open={showLoginPopover} onOpenChange={setShowLoginPopover}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="gap-1 @[400px]:gap-2 p-1.5 h-8 @[400px]:h-10"
                >
                  <Settings2 size={14} />
                  <span className="hidden @[400px]:inline">Tools</span>
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Select Tools</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-80 p-0" align="start">
            <LoginPrompt
              title="Sign in to use Tools"
              description="Access web search, deep research, and more to get better answers."
            />
          </PopoverContent>
        </Popover>
      ) : (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 @[400px]:gap-2 p-1.5 px-2.5 h-8 @[400px]:h-10"
                >
                  <Settings2 size={14} />
                  <span className="hidden @[400px]:inline">Tools</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Select Tools</TooltipContent>
          </Tooltip>
          <DropdownMenuContent
            align="start"
            className="w-48"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {enabledTools.map((key) => {
              const tool = toolDefinitions[key];
              const isDeepResearchDisabled =
                key === 'deepResearch' && hasReasoningModel;
              const isToolDisabled =
                hasUnspecifiedFeatures || isDeepResearchDisabled;
              const Icon = tool.icon;
              return (
                <DropdownMenuItem
                  key={key}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTool(tools === key ? null : key);
                  }}
                  className="flex items-center gap-2"
                  disabled={isToolDisabled}
                >
                  <Icon size={14} />
                  <span>{tool.name}</span>
                  {tools === key && (
                    <span className="text-xs opacity-70">✓</span>
                  )}
                  {hasUnspecifiedFeatures && (
                    <span className="text-xs opacity-60">(not supported)</span>
                  )}
                  {!hasUnspecifiedFeatures && isDeepResearchDisabled && (
                    <span className="text-xs opacity-60">
                      (for non-reasoning models)
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {activeTool && (
        <>
          <Separator
            orientation="vertical"
            className="bg-muted-foreground/50 h-4"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTool(null)}
            className="gap-1 @[400px]:gap-2 rounded-full h-8 @[400px]:h-10 text-primary hover:text-primary/80"
          >
            {createElement(toolDefinitions[activeTool].icon, {
              size: 14,
            })}
            <span className="hidden @[500px]:inline">
              {toolDefinitions[activeTool].shortName}
            </span>
            <X size={12} className="opacity-70" />
          </Button>
        </>
      )}
    </div>
  );
}
