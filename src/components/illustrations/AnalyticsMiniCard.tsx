import { TrendingUp, BarChart3, Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const kpis = [
  { label: 'Revenue', value: '$24.8k', change: '+12%', positive: true },
  { label: 'Bookings', value: '186', change: '+8%', positive: true },
];

const chartBars = [35, 45, 30, 60, 50, 75, 65];

export function AnalyticsMiniCard({ className }: { className?: string }) {
  return (
    <div className={cn("w-full max-w-[280px] bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-lg p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-teal-400/10 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Analytics</p>
            <p className="text-[10px] text-muted-foreground">Last 7 days</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-success font-medium">
          <TrendingUp className="h-3 w-3" />
          <span>+15%</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="p-2 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-sm font-bold text-foreground">{kpi.value}</p>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
              <span className={cn(
                "text-[9px] font-medium",
                kpi.positive ? "text-success" : "text-red-500"
              )}>
                {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Mini Chart */}
      <div className="h-14 bg-gradient-to-r from-primary/5 to-teal-400/5 rounded-lg flex items-end px-2 pb-2 gap-1.5">
        {chartBars.map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-gradient-to-t from-primary/60 to-primary/30 rounded-t-sm transition-all duration-300"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>142 guests</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>28 events</span>
        </div>
      </div>
    </div>
  );
}
