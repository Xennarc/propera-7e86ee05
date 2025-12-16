import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Palette, Code2, HeartHandshake, Lightbulb } from 'lucide-react';

const TEAM_FUNCTIONS = [
  {
    icon: Lightbulb,
    title: 'Product & Experience',
    description: 'Translates resort complexity into intuitive flows. Every feature starts with "how will the guest or staff member actually use this?"',
    bgGradient: 'from-amber-500/10 to-amber-500/5',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-500',
  },
  {
    icon: Code2,
    title: 'Engineering',
    description: 'Builds for reliability at scale. Real-time sync, multi-tenant security, and performance that doesn\'t slow down at peak times.',
    bgGradient: 'from-blue-500/10 to-blue-500/5',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-500',
  },
  {
    icon: HeartHandshake,
    title: 'Customer Success',
    description: 'Partners with resorts from onboarding through growth. Your success is how we measure ours.',
    bgGradient: 'from-emerald-500/10 to-emerald-500/5',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-500',
  },
  {
    icon: Palette,
    title: 'Design & Brand',
    description: 'Creates interfaces that feel native to luxury hospitality. Clean, intuitive, and respectful of your brand identity.',
    bgGradient: 'from-violet-500/10 to-violet-500/5',
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-500',
  },
];

export function AboutTeamSection() {
  return (
    <section className="py-20 md:py-28 bg-card relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            The team behind Propera
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            People who understand hospitality, building tools that make resort operations effortless.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {TEAM_FUNCTIONS.map((func, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`h-full bg-gradient-to-br ${func.bgGradient} border-border/50 hover:border-primary/30 transition-colors overflow-hidden group`}>
                <CardContent className="p-6 relative">
                  {/* Blurred UI background */}
                  <div className="absolute top-0 right-0 w-20 h-20 opacity-10 group-hover:opacity-20 transition-opacity">
                    <div className="w-full h-full rounded-lg bg-foreground/20 blur-sm" />
                  </div>
                  
                  <div className={`h-12 w-12 rounded-xl ${func.iconBg} flex items-center justify-center mb-4 relative z-10`}>
                    <func.icon className={`h-6 w-6 ${func.iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 relative z-10">{func.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed relative z-10">{func.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
