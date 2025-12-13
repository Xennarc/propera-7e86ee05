import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayOfWeekChartProps {
  title: string;
  description?: string;
  data: number[]; // Array of 7 values for Sun-Sat
  valueLabel?: string;
  valueFormatter?: (value: number) => string;
  highlightPeak?: boolean;
}

export function DayOfWeekChart({
  title,
  description,
  data,
  valueLabel = 'Value',
  valueFormatter = (v) => v.toLocaleString(),
  highlightPeak = true,
}: DayOfWeekChartProps) {
  const chartData = DAYS.map((day, idx) => ({
    day,
    value: data[idx] || 0,
  }));

  const maxValue = Math.max(...data);
  const peakDay = data.indexOf(maxValue);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis 
              dataKey="day" 
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
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={highlightPeak && index === peakDay 
                    ? 'hsl(var(--primary))' 
                    : 'hsl(var(--muted-foreground)/0.3)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {highlightPeak && maxValue > 0 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Peak day: <span className="font-medium text-primary">{DAYS[peakDay]}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
