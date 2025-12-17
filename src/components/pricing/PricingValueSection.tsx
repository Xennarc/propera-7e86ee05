import { motion, useInView } from 'framer-motion';
import { TrendingDown, TrendingUp, PieChart } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

// Animated count-up hook
function useCountUp(end: number, duration: number = 2000, start: number = 0) {
  const [count, setCount] = useState(start);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  useEffect(() => {
    if (!isInView) return;
    
    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(end);
      return;
    }
    
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(start + (end - start) * eased));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [isInView, end, duration, start]);
  
  return { count, ref };
}

// Mini sparkline component
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg viewBox="0 0 100 50" className="w-full h-full">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <polygon
        fill={`url(#gradient-${color})`}
        points={`0,50 ${points} 100,50`}
      />
    </svg>
  );
}

// Radial progress component
function RadialProgress({ percentage, color }: { percentage: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!isInView) return;
    
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(percentage);
      return;
    }
    
    const timeout = setTimeout(() => setProgress(percentage), 300);
    return () => clearTimeout(timeout);
  }, [isInView, percentage]);
  
  const circumference = 2 * Math.PI * 15.9;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <div ref={ref} className="relative h-16 w-16">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          className="stroke-muted/30"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color }}>{progress}%</span>
      </div>
    </div>
  );
}

const METRICS = [
  {
    icon: TrendingDown,
    value: 30,
    suffix: '%',
    prefix: 'Up to ',
    label: 'fewer front desk calls',
    description: 'Guests self-serve bookings and get answers instantly.',
    sparklineData: [100, 95, 88, 82, 78, 73, 70],
    color: 'hsl(var(--primary))',
  },
  {
    icon: TrendingUp,
    value: 20,
    suffix: '%',
    prefix: 'Up to ',
    label: 'more pre-booked experiences',
    description: 'Pre-arrival links and in-stay suggestions drive bookings.',
    sparklineData: [30, 35, 42, 48, 55, 60, 70],
    color: 'hsl(142, 76%, 36%)', // emerald
  },
  {
    icon: PieChart,
    value: 75,
    suffix: '%',
    prefix: '',
    label: 'activity & restaurant utilisation',
    description: 'Fill more seats with better visibility and upsell tools.',
    isRadial: true,
    color: 'hsl(262, 83%, 58%)', // violet
  },
];

export function PricingValueSection() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why resorts invest in Propera
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real outcomes from connected operations and better guest journeys.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
          {METRICS.map((item, index) => {
            const { count, ref } = useCountUp(item.value, 1500);
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="group"
              >
                <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 text-center h-full transition-all duration-300 hover:shadow-xl hover:border-primary/30 hover:bg-card">
                  {/* Chart visual */}
                  <div ref={ref} className="h-20 flex items-center justify-center mb-4">
                    {item.isRadial ? (
                      <RadialProgress percentage={item.value} color={item.color} />
                    ) : (
                      <div className="w-full h-full max-w-[140px]">
                        <Sparkline data={item.sparklineData!} color={item.color} />
                      </div>
                    )}
                  </div>
                  
                  {/* Metric */}
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <item.icon className="h-5 w-5 text-primary" />
                    <span className="text-3xl font-bold text-foreground">
                      {item.prefix}{count}{item.suffix}
                    </span>
                  </div>
                  
                  <p className="text-lg font-semibold text-foreground mb-2">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-muted-foreground max-w-2xl mx-auto mb-2">
            Plans scale with you—from a single resort to a global portfolio—delivering better guest journeys and clearer operations at every tier.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Sample benchmarks from multi-resort portfolios
          </p>
        </motion.div>
      </div>
    </section>
  );
}
