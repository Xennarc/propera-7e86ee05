import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock } from 'lucide-react';

interface LeadTimeDistributionProps {
  title: string;
  description?: string;
  data: {
    sameDay: number;
    oneDay: number;
    twoDays: number;
    threePlusDays: number;
    weekPlus: number;
  };
  valueLabel?: string;
}

export function LeadTimeDistribution({
  title,
  description,
  data,
  valueLabel = 'Bookings',
}: LeadTimeDistributionProps) {
  const chartData = [
    { label: 'Same day', value: data.sameDay, color: 'hsl(var(--destructive))' },
    { label: '1 day', value: data.oneDay, color: 'hsl(var(--chart-4))' },
    { label: '2 days', value: data.twoDays, color: 'hsl(var(--chart-2))' },
    { label: '3-6 days', value: data.threePlusDays, color: 'hsl(var(--primary))' },
    { label: '7+ days', value: data.weekPlus, color: 'hsl(var(--chart-3))' },
  ];

  const total = Object.values(data).reduce((sum, v) => sum + v, 0);
  const avgLeadTime = total > 0 
    ? (data.sameDay * 0 + data.oneDay * 1 + data.twoDays * 2 + data.threePlusDays * 4.5 + data.weekPlus * 10) / total
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-foreground">{avgLeadTime.toFixed(1)} days</div>
            <div className="text-xs text-muted-foreground">avg lead time</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis type="number" className="text-xs" tickLine={false} axisLine={false} />
            <YAxis 
              dataKey="label" 
              type="category" 
              className="text-xs" 
              width={70}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [value, valueLabel]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
