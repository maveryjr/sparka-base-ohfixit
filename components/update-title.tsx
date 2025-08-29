import { TextShimmerLoader } from '@/components/prompt-kit/loader';
import { cn } from '@/lib/utils';

export const UpdateTitle = ({
  title,
  isRunning,
  className,
}: {
  title: string;
  isRunning: boolean;
  className?: string;
}) => {
  if (isRunning) {
    return (
      <TextShimmerLoader
        text={title}
        className={cn('text-sm font-medium', className)}
      />
    );
  }

  return <h3 className={cn('text-sm font-medium', className)}>{title}</h3>;
};
