import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar, Building, CheckCircle } from 'lucide-react';
import type { ModelDefinition } from '@/lib/ai/all-models';
import type { ProviderId } from '@/providers/models-generated';
import { cn } from '@/lib/utils';
import { getFeatureConfig, isFeatureEnabled } from '@/lib/features-config';
import { getProviderIcon } from './get-provider-icon';
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

const PlaceholderIcon = () => <Building className="size-6" />;

const getFeatureIconsForCard = (model: ModelDefinition) => {
  const icons: React.ReactNode[] = [];

  // Check for reasoning capability
  if (model.features?.reasoning && isFeatureEnabled('reasoning')) {
    const config = getFeatureConfig('reasoning');
    if (config?.icon) {
      const IconComponent = config.icon;
      icons.push(
        <Tooltip key="reasoning">
          <TooltipTrigger asChild>
            <div className="p-1.5 bg-muted rounded">
              <IconComponent className="size-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.description}</p>
          </TooltipContent>
        </Tooltip>,
      );
    }
  }

  return icons;
};

export function ModelCard({
  model,
  isSelected,
  isDisabled,
  disabledReason,
  className,
}: {
  model: ModelDefinition;
  isSelected?: boolean;
  isDisabled?: boolean;
  disabledReason?: string;
  className?: string;
}) {
  const provider = model.owned_by as ProviderId;
  const description = model.description;
  const maxTokens = model.max_tokens;
  const contextLength = model.context_window;
  const hasFeatures = model.features && Object.keys(model.features).length > 0;

  const featureIcons = getFeatureIconsForCard(model);

  // Show placeholder if disabled with reason
  if (isDisabled && disabledReason) {
    return (
      <Card
        className={cn(
          'cursor-not-allowed opacity-50',
          'bg-muted/50',
          className,
        )}
      >
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="transition-transform bg-muted rounded-lg p-1">
              <PlaceholderIcon />
            </div>
            <div className="text-left">
              <CardTitle className="text-sm font-semibold">
                {model.name}
              </CardTitle>
              <CardDescription className="capitalize">
                {provider}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground text-center w-full">
            {disabledReason}
          </div>
        </CardContent>
      </Card>
    );
  }

  const cardContent = (
    <Card
      className={cn(
        'group cursor-pointer transition-all hover:shadow-md',
        isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
        isDisabled && 'opacity-50 cursor-not-allowed hover:shadow-none',
        className,
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="transition-transform bg-muted rounded-lg p-1 group-hover:rotate-12">
            {getProviderIcon(provider, 24)}
          </div>
          <div className="text-left">
            <CardTitle className="text-sm font-semibold">
              {model.name}
            </CardTitle>
            <CardDescription className="capitalize">{provider}</CardDescription>
          </div>
        </div>
        {isSelected && (
          <CardAction>
            <CheckCircle className="size-4 text-primary" />
          </CardAction>
        )}
      </CardHeader>

      {description && (
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2 text-left">
            {description}
          </p>
        </CardContent>
      )}

      <CardContent>
        <div className="flex justify-start items-center gap-3 text-xs text-muted-foreground text-start">
          {maxTokens && (
            <div className="flex items-center gap-1">
              <span className="font-medium">{maxTokens.toLocaleString()}</span>
              <span>Max out</span>
            </div>
          )}
          {contextLength && (
            <div className="flex items-center gap-1">
              <span className="font-medium">
                {contextLength.toLocaleString()}
              </span>
              <span>Max in</span>
            </div>
          )}
        </div>

        {hasFeatures && (
          <div className="flex flex-wrap gap-1 mt-3 w-full">
            {model.features?.reasoning && (
              <Badge variant="outline" className="text-xs">
                Reasoning
              </Badge>
            )}
            {model.features?.functionCalling && (
              <Badge variant="outline" className="text-xs">
                Function Calling
              </Badge>
            )}
            {model.features?.input?.image && (
              <Badge variant="outline" className="text-xs">
                Vision
              </Badge>
            )}
            {model.features?.input?.pdf && (
              <Badge variant="outline" className="text-xs">
                PDF
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      {model.pricing && (
        <CardFooter>
          <div className="flex items-center gap-4 text-xs text-muted-foreground w-full">
            {model.pricing.input && (
              <div className="flex items-center gap-1">
                <Calendar className="size-3" />
                <span>
                  ${(Number(model.pricing.input) * 1000000).toFixed(2)}/1M in
                </span>
              </div>
            )}
            {model.pricing.output && (
              <div className="flex items-center gap-1">
                <Calendar className="size-3" />
                <span>
                  ${(Number(model.pricing.output) * 1000000).toFixed(2)}/1M out
                </span>
              </div>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );

  if (isDisabled) {
    return cardContent;
  }

  return <TooltipProvider>{cardContent}</TooltipProvider>;
}
