import { motion, useInView } from 'framer-motion';
import { TrendingUp, TrendingDown, Globe, Users } from 'lucide-react';
import { useRef, useState, useEffect, memo } from 'react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';

const metrics = [
  {
    value: 30,
    suffix: '%',
    label: 'fewer calls to front desk',
    description: 'Guests self-serve through the app',
    trend: 'down' as const,
    chart: [60, 50, 45, 38, 35, 30],
  },
  {
    value: 20,
    suffix: '%',
    label: 'more pre-booked activities',
    description: 'Pre-arrival engagement drives revenue',
    trend: 'up' as const,
    chart: [40, 48, 55, 62, 70, 80],
  },
  {
    value: 50,
    suffix: '+',
    label: 'resorts worldwide',
    description: 'Island, mountain, city, and wellness',
    icon: Globe,
  },
  {
    value: 89,
    suffix: '%',
    label: 'staff satisfaction',
    description: 'Easier coordination, less chaos',
    icon: Users,
  },
];

type Metric = typeof metrics[0];

// Memoized metric card for performance
const MetricCard = memo(function MetricCard({ 
  metric, 
  index, 
  isInView,
  shouldAnimate 
}: { 
  metric: Metric; 
  index: number; 
  isInView: boolean;
  shouldAnimate: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(shouldAnimate ? 0 : metric.value);
  const hasAnimated = useRef(false);
  
  useEffect(() => {
    if (!isInView || !shouldAnimate || hasAnimated.current) {
      if (isInView) setDisplayValue(metric.value);
      return;
    }
    
    hasAnimated.current = true;
    const duration = 1200;
    const startTime = performance.now();
    let rafId: number;
    
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * metric.value));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    
    const timeout = setTimeout(() => {
      rafId = requestAnimationFrame(tick);
    }, 200 + index * 100);
    
    return () => {
      clearTimeout(timeout);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isInView, metric.value, index, shouldAnimate]);
  
  // Calculate chart progress based on animation state
  const chartProgress = hasAnimated.current || !shouldAnimate ? 1 : 0;
  
  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.08] will-change-transform"
    >
      <div className="mb-4">
        <span className="text-4xl md:text-5xl font-bold text-white">
          {displayValue}{metric.suffix}
        </span>
      </div>
      <p className="text-white font-medium mb-1">{metric.label}</p>
      <p className="text-sm text-white/50 mb-4">{metric.description}</p>

      {/* Chart - CSS-only animation */}
      {metric.chart ? (
        <div className="h-12 flex items-end gap-1">
          {metric.chart.map((val, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t transition-all duration-700 ${
                metric.trend === 'up' ? 'bg-success' : 'bg-primary'
              }`}
              style={{ 
                height: isInView ? `${val}%` : '0%',
                opacity: 0.3 + (i * 0.14),
                transitionDelay: `${i * 80}ms`
              }}
            />
          ))}
        </div>
      ) : metric.icon ? (
        <div className="h-12 flex items-center">
          <metric.icon className="h-8 w-8 text-primary" />
        </div>
      ) : null}

      {metric.trend && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${metric.trend === 'up' ? 'text-success' : 'text-primary'}`}>
          {metric.trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span>vs. before Propera</span>
        </div>
      )}
    </motion.div>
  );
});

export function MetricsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const { shouldAnimate } = useAnimationPreference();

  return (
    <section ref={sectionRef} className="py-24 relative overflow-hidden">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-teal-400/10 via-transparent to-transparent" />
      
      <div className="container relative mx-auto px-4">
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            The results speak for themselves
          </h2>
          <p className="text-lg text-white/60">
            Real impact from real resorts using Propera
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <MetricCard 
              key={metric.label} 
              metric={metric} 
              index={index} 
              isInView={isInView}
              shouldAnimate={shouldAnimate}
            />
          ))}
        </div>
        
        {/* Caption */}
        <motion.p
          initial={shouldAnimate ? { opacity: 0 } : { opacity: 1 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-white/40 text-sm mt-12"
        >
          Sample data from multi-resort portfolios
        </motion.p>
      </div>
    </section>
  );
}
