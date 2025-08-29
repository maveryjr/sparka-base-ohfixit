import { WithSkeleton } from '@/components/with-skeleton';

export default function Loading() {
  return (
    <WithSkeleton isLoading={true} className="w-full h-full">
      <div className="flex h-dvh w-full" />
    </WithSkeleton>
  );
}
