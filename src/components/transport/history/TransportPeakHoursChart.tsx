import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TransportPeakHoursChartProps {
  data: number[];
  peakHour: number;
}

const HOUR_LABELS = [
  '12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am',
  '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm',
];

export function TransportPeakHoursChart({ data, peakHour }: TransportPeakHoursChartProps) {
  const chartData = data.map((value, idx) => ({
    hour: HOUR_LABELS[idx],
    value,
  }));

  const maxValue = Math.max(...data);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Requests by Hour</CardTitle>
        <CardDescription>
          Peak hour: <span className="font-medium text-primary">{HOUR_LABELS[peakHour]}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis 
              dataKey="hour" 
              className="text-xs" 
              tickLine={false}
              axisLine={false}
              interval={3}
            />
            <YAxis 
              className="text-xs" 
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [value, 'Requests']}
            />
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={data[index] === maxValue && maxValue > 0
                    ? 'hsl(var(--primary))' 
                    : 'hsl(var(--muted-foreground)/0.3)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
