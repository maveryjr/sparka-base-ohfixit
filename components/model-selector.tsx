'use client';

import {
  startTransition,
  useMemo,
  useOptimistic,
  useState,
  memo,
  type ComponentProps,
  useCallback,
} from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ModelCard } from '@/components/model-card';
import { cn } from '@/lib/utils';
import {
  chatModels,
  getModelDefinition,
  type ModelDefinition,
} from '@/lib/ai/all-models';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getEnabledFeatures } from '@/lib/features-config';
import { ANONYMOUS_LIMITS } from '@/lib/types/anonymous';
import { LoginCtaBanner } from '@/components/upgrade-cta/login-cta-banner';

import { ChevronUpIcon, FilterIcon } from 'lucide-react';
import type { ModelId } from '@/lib/ai/model-id';
import type { ProviderId } from '@/providers/models-generated';
import { getProviderIcon } from './get-provider-icon';

type FeatureFilter = Record<string, boolean>;

// Pre-compute static data outside component to avoid re-computation
const enabledFeatures = getEnabledFeatures();
const initialFilters = enabledFeatures.reduce<FeatureFilter>((acc, feature) => {
  acc[feature.key] = false;
  return acc;
}, {});

// Cache model definitions to avoid repeated calls
const modelDefinitionsCache = new Map<ModelId, ModelDefinition>();
const getModelDefinitionCached = (modelId: ModelId) => {
  if (!modelDefinitionsCache.has(modelId)) {
    modelDefinitionsCache.set(modelId, getModelDefinition(modelId));
  }

  const res = modelDefinitionsCache.get(modelId);
  if (!res) {
    throw new Error(`Model definition not found for ${modelId}`);
  }
  return res;
};

function getFeatureIcons(modelDefinition: any) {
  const features = modelDefinition.features;
  if (!features) return [];

  const icons: JSX.Element[] = [];

  // Get enabled features for icon mapping
  const enabledFeatures = getEnabledFeatures();

  // Map features to icons
  const featureIconMap = [
    {
      key: 'reasoning',
      condition: features.reasoning,
      config: enabledFeatures.find((f) => f.key === 'reasoning'),
    },
    {
      key: 'functionCalling',
      condition: features.functionCalling,
      config: enabledFeatures.find((f) => f.key === 'functionCalling'),
    },
    {
      key: 'imageInput',
      condition: features.input?.image,
      config: enabledFeatures.find((f) => f.key === 'imageInput'),
    },
    {
      key: 'pdfInput',
      condition: features.input?.pdf,
      config: enabledFeatures.find((f) => f.key === 'pdfInput'),
    },
  ];

  featureIconMap.forEach(({ condition, config }) => {
    if (condition && config) {
      const IconComponent = config.icon;
      icons.push(
        <div
          key={config.key}
          className="flex items-center"
          title={config.description}
        >
          <IconComponent className="w-3 h-3 text-muted-foreground" />
        </div>,
      );
    }
  });

  return icons;
}

export function PureModelSelector({
  selectedModelId,
  className,
  onModelChange,
}: {
  selectedModelId: ModelId;
  onModelChange?: (modelId: ModelId) => void;
} & ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);

  const { data: session } = useSession();
  const isAnonymous = !session?.user;

  const [featureFilters, setFeatureFilters] =
    useState<FeatureFilter>(initialFilters);

  // Memoize expensive computations
  const filteredModels = useMemo(() => {
    const hasActiveFilters = Object.values(featureFilters).some(Boolean);

    if (!hasActiveFilters) {
      return chatModels;
    }

    return chatModels.filter((model) => {
      const modelDef = getModelDefinitionCached(model.id);
      const features = modelDef?.features;

      if (!features) return false;

      // Check each active filter
      return Object.entries(featureFilters).every(([key, isActive]) => {
        if (!isActive) return true;

        switch (key) {
          case 'reasoning':
            return features.reasoning;
          case 'functionCalling':
            return features.functionCalling;
          case 'imageInput':
            return features.input.image;
          case 'pdfInput':
            return features.input.pdf;
          case 'audioInput':
            return features.input.audio;
          case 'imageOutput':
            return features.output.image;
          case 'audioOutput':
            return features.output.audio;
          default:
            return true;
        }
      });
    });
  }, [featureFilters]);

  // Memoize model availability checks
  const modelAvailability = useMemo(() => {
    const isModelAvailableForAnonymous = (modelId: ModelId) => {
      return ANONYMOUS_LIMITS.AVAILABLE_MODELS.includes(modelId as any);
    };

    const isModelDisabled = (modelId: ModelId) => {
      return isAnonymous && !isModelAvailableForAnonymous(modelId);
    };

    return {
      isModelDisabled,
      hasDisabledModels:
        isAnonymous &&
        filteredModels.some((model) => isModelDisabled(model.id)),
    };
  }, [isAnonymous, filteredModels]);

  const selectedChatModel = useMemo(
    () => chatModels.find((chatModel) => chatModel.id === optimisticModelId),
    [optimisticModelId],
  );

  // Get selected model's provider icon
  const selectedModelDefinition = useMemo(() => {
    if (!selectedChatModel) return null;
    return getModelDefinitionCached(selectedChatModel.id);
  }, [selectedChatModel]);

  const selectedProviderIcon = useMemo(() => {
    if (!selectedModelDefinition) return null;
    const provider = selectedModelDefinition.owned_by as ProviderId;
    return getProviderIcon(provider);
  }, [selectedModelDefinition]);

  const activeFilterCount = useMemo(
    () => Object.values(featureFilters).filter(Boolean).length,
    [featureFilters],
  );

  const clearFilters = useCallback(() => {
    setFeatureFilters(initialFilters);
  }, []);

  // Only render the expensive popover content when it's open
  const popoverContent = useMemo(() => {
    if (!open) return null;

    return (
      <Command>
        <div className="flex items-center border-b">
          <CommandInput
            placeholder="Search models..."
            className="px-3"
            containerClassName="w-full border-0 h-11"
          />
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'mr-3 h-8 w-8 p-0 relative',
                  activeFilterCount > 0 && 'text-primary',
                )}
              >
                <FilterIcon className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-1 -right-1 text-xs min-w-[16px] h-4 flex items-center justify-center p-0"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="end">
              <div className="p-4">
                <div className="mb-3 h-7 flex items-center justify-between">
                  <div className="text-sm font-medium">Filter by Tools</div>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-xs h-6"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {enabledFeatures.map((feature) => {
                    const IconComponent = feature.icon;

                    return (
                      <div
                        key={feature.key}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={feature.key}
                          checked={featureFilters[feature.key] || false}
                          onCheckedChange={(checked) =>
                            setFeatureFilters((prev) => ({
                              ...prev,
                              [feature.key]: Boolean(checked),
                            }))
                          }
                        />
                        <Label
                          htmlFor={feature.key}
                          className="text-sm flex items-center gap-1.5"
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                          {feature.name}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {modelAvailability.hasDisabledModels && (
          <div className="p-3">
            <LoginCtaBanner
              message="Sign in to unlock all models."
              variant="default"
              compact
            />
          </div>
        )}
        <CommandList
          className="max-h-[400px]"
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
        >
          <CommandEmpty>No model found.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="*:data-radix-scroll-area-viewport:max-h-[350px]">
              <TooltipProvider delayDuration={300}>
                {filteredModels.map((chatModel) => {
                  const { id } = chatModel;
                  const modelDefinition = getModelDefinitionCached(id);
                  const disabled = modelAvailability.isModelDisabled(id);
                  const provider = modelDefinition.owned_by as ProviderId;
                  const isSelected = id === optimisticModelId;
                  const featureIcons = getFeatureIcons(modelDefinition);

                  // Create searchable value combining model name and provider
                  const searchValue =
                    `${modelDefinition.name} ${modelDefinition.owned_by}`.toLowerCase();

                  return (
                    <Tooltip key={id}>
                      <TooltipTrigger asChild>
                        <div>
                          <CommandItem
                            value={searchValue}
                            onSelect={(event) => {
                              if (disabled) return; // Prevent selection of disabled models

                              startTransition(() => {
                                setOptimisticModelId(id);
                                onModelChange?.(id);
                                setOpen(false);
                              });
                            }}
                            className={cn(
                              'flex items-center justify-between px-3 py-1.5 cursor-pointer transition-all h-9',
                              isSelected &&
                                'bg-primary/10 border-l-2 border-l-primary',
                              disabled && 'opacity-50 cursor-not-allowed',
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="shrink-0">
                                {getProviderIcon(provider)}
                              </div>
                              <span className="font-medium text-sm truncate">
                                {modelDefinition.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {featureIcons.length > 0 && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {featureIcons}
                                </div>
                              )}
                            </div>
                          </CommandItem>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        align="start"
                        className="p-0"
                        variant="base"
                        sideOffset={8}
                      >
                        <ModelCard
                          model={modelDefinition}
                          isSelected={isSelected}
                          isDisabled={disabled}
                          disabledReason={
                            disabled
                              ? 'Sign in to access this model'
                              : undefined
                          }
                          className="w-[280px] shadow-lg border border-none"
                        />
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </ScrollArea>
          </CommandGroup>
        </CommandList>
      </Command>
    );
  }, [
    open,
    filterOpen,
    activeFilterCount,
    featureFilters,
    filteredModels,
    modelAvailability,
    optimisticModelId,
    setOptimisticModelId,
    onModelChange,
    clearFilters,
  ]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid="model-selector"
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className={cn('w-fit md:px-2 gap-0', className)}
        >
          <div className="flex items-center gap-2">
            {selectedProviderIcon && (
              <div className="shrink-0">{selectedProviderIcon}</div>
            )}
            <p className="truncate">{selectedChatModel?.name}</p>
          </div>
          <ChevronUpIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        {popoverContent}
      </PopoverContent>
    </Popover>
  );
}

export const ModelSelector = memo(PureModelSelector, (prevProps, nextProps) => {
  return (
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.className === nextProps.className &&
    prevProps.onModelChange === nextProps.onModelChange
  );
});
