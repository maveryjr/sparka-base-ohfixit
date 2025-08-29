import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Check, Loader2, TrendingUpIcon } from 'lucide-react';
import InteractiveStockChart, {
  type StockChartProps,
} from './interactive-stock-chart';

export function StockChartMessage({
  result,
  args,
}: {
  result: {
    chart: StockChartProps['chart'];
  } | null;
  args: {
    title: StockChartProps['title'];
    stock_symbols: StockChartProps['stock_symbols'];
    interval: StockChartProps['interval'];
  };
}) {
  return (
    <div className="flex flex-col gap-3 w-full mt-4">
      <Badge
        variant="secondary"
        className={cn(
          'w-fit flex items-center gap-3 px-4 py-2 rounded-full transition-colors duration-200',
          !result
            ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
            : 'bg-green-50/50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
        )}
      >
        <TrendingUpIcon className="h-4 w-4" />
        <span className="font-medium">{args.title}</span>
        {!result ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </Badge>

      {result?.chart && (
        <div className="w-full">
          <InteractiveStockChart
            title={args.title}
            chart={{
              ...result.chart,
              x_scale: 'datetime',
            }}
            data={result.chart.elements}
            stock_symbols={args.stock_symbols}
            interval={args.interval}
          />
        </div>
      )}
    </div>
  );
}
