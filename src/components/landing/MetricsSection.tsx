import { motion, useInView } from 'framer-motion';
import { TrendingUp, TrendingDown, Globe, Users } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

const metrics = [
  {
    value: 30,
    suffix: '%',
    label: 'fewer calls to front desk',
    description: 'Guests self-serve through the app',
    trend: 'down',
    chart: [60, 50, 45, 38, 35, 30],
  },
  {
    value: 20,
    suffix: '%',
    label: 'more pre-booked activities',
    description: 'Pre-arrival engagement drives revenue',
    trend: 'up',
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

export function MetricsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });
  const [reducedMotion, setReducedMotion] = useState(false);
  
  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  return (
    <section ref={sectionRef} className="py-24 relative overflow-hidden">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-teal-400/10 via-transparent to-transparent" />
      
      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
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
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
        
        {/* Caption */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center text-white/40 text-sm mt-12"
        >
          Sample data from multi-resort portfolios
        </motion.p>
      </div>
    </section>
  );
}

function MetricCard({ 
  metric, 
  index, 
  isInView,
  reducedMotion 
}: { 
  metric: typeof metrics[0]; 
  index: number; 
  isInView: boolean;
  reducedMotion: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(reducedMotion ? metric.value : 0);
  const [chartProgress, setChartProgress] = useState(reducedMotion ? 1 : 0);
  
  useEffect(() => {
    if (!isInView || reducedMotion) return;
    
    // Animate number
    const duration = 1500;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * metric.value));
      setChartProgress(eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    const timeout = setTimeout(tick, 300 + index * 150);
    return () => clearTimeout(timeout);
  }, [isInView, metric.value, index, reducedMotion]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4, backgroundColor: 'rgba(255,255,255,0.1)' }}
      className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 transition-all duration-300"
    >
      <div className="mb-4">
        <span className="text-4xl md:text-5xl font-bold text-white">
          {displayValue}{metric.suffix}
        </span>
      </div>
      <p className="text-white font-medium mb-1">{metric.label}</p>
      <p className="text-sm text-white/50 mb-4">{metric.description}</p>

      {/* Chart or Icon */}
      {metric.chart ? (
        <div className="h-12 flex items-end gap-1">
          {metric.chart.map((val, i) => {
            const height = val * chartProgress;
            return (
              <motion.div
                key={i}
                className={`flex-1 rounded-t transition-all ${
                  metric.trend === 'up' ? 'bg-success' : 'bg-primary'
                }`}
                style={{ 
                  height: `${height}%`, 
                  opacity: 0.3 + (i * 0.14) 
                }}
              />
            );
          })}
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
}
