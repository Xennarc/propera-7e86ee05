import { motion } from 'framer-motion';
import { 
  Shield, Users, Building2, Globe, KeyRound, 
  LayoutDashboard, Terminal, FileText, Check
} from 'lucide-react';

const ALWAYS_INCLUDED = [
  {
    icon: KeyRound,
    title: 'Authentication & Security',
    description: 'Staff login, guest portal PIN access, role-based permissions',
  },
  {
    icon: Building2,
    title: 'Multi-Tenant Architecture',
    description: 'Full resort isolation, secure data separation per property',
  },
  {
    icon: LayoutDashboard,
    title: 'Staff Dashboard',
    description: 'Team directory, today hub, resort switching for multi-property users',
  },
  {
    icon: Globe,
    title: 'Public Pages',
    description: 'Landing, pricing, about pages, and resort marketing portals',
  },
  {
    icon: Terminal,
    title: 'Super Admin Tools',
    description: 'Command center, health monitoring, audit logs, feature flags',
  },
  {
    icon: Shield,
    title: 'Resort Context Switching',
    description: 'Seamless navigation between properties for portfolio managers',
  },
];

export function PricingAlwaysIncluded() {
  return (
    <section className="py-16 md:py-20 bg-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-card border border-border/50 text-foreground px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Shield className="h-4 w-4 text-primary" />
            Always included
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Core platform, every plan
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            These capabilities are role-gated (not tier-gated) and come standard with every Propera subscription.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {ALWAYS_INCLUDED.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 p-5 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
