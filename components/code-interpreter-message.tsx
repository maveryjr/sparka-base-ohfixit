import InteractiveChart, { type BaseChart } from './interactive-charts';
import { CollapsibleSection } from './collapsible-section';

export function CodeInterpreterMessage({
  result,
  args,
}: {
  result: {
    chart: BaseChart;
    message: string;
  } | null;
  args: {
    code: string;
    title: string;
    icon: string;
  };
}) {
  return (
    <div className="space-y-6">
      <CollapsibleSection
        code={args.code}
        output={result?.message}
        language="python"
        title={args.title}
        icon={args.icon || 'default'}
        status={result ? 'completed' : 'running'}
      />

      {result?.chart && (
        <div className="pt-1">
          <InteractiveChart chart={result.chart} />
        </div>
      )}
    </div>
  );
}
