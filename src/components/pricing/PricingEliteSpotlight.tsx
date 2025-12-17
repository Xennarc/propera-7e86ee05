import { motion } from 'framer-motion';
import { Crown, Sparkles, TrendingUp, Users, Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PricingEliteSpotlight() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-violet-950 via-purple-950 to-violet-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5MzNiZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/20 text-violet-300 text-sm font-medium mb-6">
                <Crown className="h-4 w-4" />
                Elite Plan
              </div>
              
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                Unlock the full power of
                <span className="block bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                  data-driven hospitality
                </span>
              </h2>
              
              <p className="text-lg text-violet-200/80 mb-8">
                Transform guest experiences into lasting relationships with AI-powered insights, 
                loyalty programs, and portfolio-wide analytics.
              </p>
              
              {/* Outcome cards */}
              <div className="space-y-4 mb-8">
                {[
                  { icon: Users, title: 'Turn stays into repeat guests', desc: 'Build loyalty with tiered rewards and personalized perks.' },
                  { icon: Sparkles, title: 'AI Revenue Coach', desc: 'Get actionable recommendations to maximize every booking.' },
                  { icon: TrendingUp, title: 'See performance across properties', desc: 'Portfolio-wide dashboards for group-level decisions.' },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-violet-500/20 backdrop-blur-sm"
                  >
                    <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                      <p className="text-sm text-violet-200/70">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <Button 
                asChild 
                size="lg"
                className="rounded-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-xl shadow-violet-500/30 h-14 px-8 text-base font-semibold"
              >
                <a href="mailto:hello@propera.cc?subject=Elite Plan Demo">
                  Book an Elite demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </motion.div>
            
            {/* Visual mockups */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Loyalty card mockup */}
              <motion.div
                className="absolute -top-4 -left-4 w-64 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 p-5 backdrop-blur-sm z-20"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-amber-400 text-xs font-medium">Gold Member</div>
                    <div className="text-white font-bold">Sarah Chen</div>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-violet-300/70 text-xs">Points balance</div>
                    <div className="text-white text-2xl font-bold">12,450</div>
                  </div>
                  <div className="text-right">
                    <div className="text-violet-300/70 text-xs">Next tier</div>
                    <div className="text-amber-400 text-sm font-medium">550 pts away</div>
                  </div>
                </div>
              </motion.div>
              
              {/* Portfolio dashboard mockup */}
              <div className="relative ml-8 mt-20">
                <div className="rounded-2xl bg-white/5 border border-violet-500/20 p-6 backdrop-blur-sm">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-violet-400" />
                      <span className="text-white font-semibold">Portfolio Overview</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                      <motion.div 
                        className="h-2 w-2 rounded-full bg-emerald-400"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      Live
                    </div>
                  </div>
                  
                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { label: 'Total Revenue', value: '$248K', change: '+12%' },
                      { label: 'Bookings', value: '1,842', change: '+8%' },
                      { label: 'Loyalty Members', value: '456', change: '+23%' },
                    ].map((stat, i) => (
                      <div key={i} className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/10">
                        <div className="text-violet-300/70 text-xs mb-1">{stat.label}</div>
                        <div className="text-white font-bold text-lg">{stat.value}</div>
                        <div className="text-emerald-400 text-xs">{stat.change}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Chart placeholder */}
                  <div className="h-32 rounded-xl bg-violet-500/5 border border-violet-500/10 flex items-end p-4 gap-1">
                    {[40, 65, 45, 80, 55, 70, 85, 60, 75, 90].map((h, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-violet-500/50 to-violet-400/30"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.05, duration: 0.4 }}
                      />
                    ))}
                  </div>
                </div>
                
                {/* AI insight floating card */}
                <motion.div
                  className="absolute -bottom-6 -right-6 w-56 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 p-4 backdrop-blur-sm"
                  animate={{ y: [0, 5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-violet-400" />
                    <span className="text-violet-300 text-xs font-medium">AI Insight</span>
                  </div>
                  <p className="text-white text-sm">
                    Sunset cruises are 34% more likely to convert when suggested to couples.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
