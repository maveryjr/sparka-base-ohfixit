import { FileText } from 'lucide-react';
import {
  ToolActionContainer,
  ToolActionKind,
  ToolActionContent,
} from './tool-action';
import type { WebSearchUpdate } from '@/lib/ai/tools/research-updates-schema';

// Base interface for all tool actions
interface BaseToolActionProps {
  index?: number;
}

// Web tool action for a single result
export const WebToolAction = ({
  result,
}: BaseToolActionProps & {
  result: NonNullable<WebSearchUpdate['results']>[number];
}) => {
  if (!result) return null;

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(result.url).hostname}&sz=128`;

  return (
    <ToolActionContainer href={result.url}>
      <ToolActionKind
        icon={<FileText className="h-4 w-4 text-foreground/80" />}
        name="Reading Web"
      />
      <ToolActionContent title={result.title} faviconUrl={faviconUrl} />
    </ToolActionContainer>
  );
};
