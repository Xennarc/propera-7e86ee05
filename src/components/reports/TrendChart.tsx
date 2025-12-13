import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendChartProps {
  title: string;
  description?: string;
  data: { date: string; value: number }[];
  valueLabel?: string;
  valueFormatter?: (value: number) => string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

const colorMap = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--chart-2))',
  warning: 'hsl(var(--chart-4))',
  danger: 'hsl(var(--destructive))',
};

export function TrendChart({
  title,
  description,
  data,
  valueLabel = 'Value',
  valueFormatter = (v) => v.toLocaleString(),
  color = 'primary',
}: TrendChartProps) {
  // Calculate trend
  const trend = data.length >= 2 
    ? ((data[data.length - 1].value - data[0].value) / (data[0].value || 1)) * 100
    : 0;

  const TrendIcon = trend > 5 ? TrendingUp : trend < -5 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-chart-2' : trend < 0 ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {data.length >= 2 && (
            <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorMap[color]} stopOpacity={0.3} />
                <stop offset="100%" stopColor={colorMap[color]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis 
              dataKey="date" 
              className="text-xs" 
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              className="text-xs" 
              tickLine={false}
              axisLine={false}
              tickFormatter={valueFormatter}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [valueFormatter(value), valueLabel]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={colorMap[color]}
              strokeWidth={2}
              fill={`url(#gradient-${title})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
