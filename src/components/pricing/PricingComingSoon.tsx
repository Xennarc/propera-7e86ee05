import { motion } from 'framer-motion';
import { Sparkles, Bot, BarChart2, Users, Rocket } from 'lucide-react';

const COMING_SOON = [
  {
    icon: Bot,
    title: 'AI Concierge',
    description: 'Intelligent guest assistance powered by AI',
    tier: 'Elite',
  },
  {
    icon: BarChart2,
    title: 'Tier Visibility Dashboard',
    description: 'Understand feature usage across your subscription',
    tier: 'Elite',
  },
  {
    icon: Users,
    title: 'Expanded Guest-Side Tier Gating',
    description: 'More granular control over guest portal features',
    tier: 'Elite',
  },
];

export function PricingComingSoon() {
  return (
    <section className="py-12 md:py-16 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-violet-500/5 border-y border-violet-500/10">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row items-center justify-between gap-8"
        >
          {/* Header */}
          <div className="text-center md:text-left md:max-w-xs shrink-0">
            <div className="inline-flex items-center gap-2 bg-violet-500/10 text-violet-500 px-3 py-1.5 rounded-full text-xs font-semibold mb-3 border border-violet-500/20">
              <Rocket className="h-3.5 w-3.5" />
              Coming Soon
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Elite Roadmap
            </h3>
            <p className="text-sm text-muted-foreground">
              Premium features in active development for Elite subscribers.
            </p>
          </div>

          {/* Items */}
          <div className="flex flex-wrap justify-center md:justify-end gap-4 flex-1">
            {COMING_SOON.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 bg-card/80 backdrop-blur-sm border border-violet-500/20 rounded-xl px-4 py-3 min-w-[200px]"
              >
                <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-4.5 w-4.5 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
