import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, Users, Calendar, BarChart3, Settings, 
  ChevronDown, Check, Minus, Sparkles,
  Utensils, Bell, Heart, Briefcase, TrendingUp
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  FEATURE_NAMES, 
  FEATURE_CATEGORIES,
  getFeatureTier,
  type TierFeature,
  type SubscriptionTier
} from '@/lib/tier-features';

// Tab configuration mapped to feature categories
const TABS = [
  { 
    id: 'guest', 
    label: 'Guest Experience', 
    icon: Smartphone,
    categories: ['Guest Portal'] as const
  },
  { 
    id: 'staff', 
    label: 'Staff Operations', 
    icon: Users,
    categories: ['Guest Management', 'Operations & Upsell', 'Notifications'] as const
  },
  { 
    id: 'scheduling', 
    label: 'Scheduling', 
    icon: Calendar,
    categories: ['Activities', 'Restaurants'] as const
  },
  { 
    id: 'reports', 
    label: 'Reports & Insights', 
    icon: BarChart3,
    categories: ['Reports & Analytics'] as const
  },
  { 
    id: 'admin', 
    label: 'Admin & Platform', 
    icon: Settings,
    categories: ['Settings'] as const
  },
];

// Category icons
const CATEGORY_ICONS: Record<string, typeof Smartphone> = {
  'Guest Portal': Smartphone,
  'Guest Management': Users,
  'Activities': Calendar,
  'Restaurants': Utensils,
  'Operations & Upsell': TrendingUp,
  'Reports & Analytics': BarChart3,
  'Settings': Settings,
  'Notifications': Bell,
};

// Tier badge component
function TierBadge({ tier, size = 'sm' }: { tier: SubscriptionTier; size?: 'sm' | 'xs' }) {
  const config = {
    ESSENTIAL: { label: 'Essential', className: 'bg-muted text-muted-foreground border-border' },
    PROFESSIONAL: { label: 'Pro', className: 'bg-primary/10 text-primary border-primary/20' },
    ELITE: { label: 'Elite', className: 'bg-violet-500/10 text-violet-500 border-violet-500/20' },
  };
  
  const { label, className } = config[tier];
  const sizeClasses = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${className} ${sizeClasses}`}>
      {tier === 'ELITE' && <Sparkles className="h-2.5 w-2.5 mr-0.5" />}
      {label}
    </span>
  );
}

// Staff/Guest pill
function AudiencePill({ audience }: { audience: 'staff' | 'guest' | 'both' }) {
  const config = {
    staff: { label: 'Staff', className: 'bg-lagoon-500/10 text-lagoon-500' },
    guest: { label: 'Guest', className: 'bg-coral-500/10 text-coral-500' },
    both: { label: 'Both', className: 'bg-orchid-500/10 text-orchid-500' },
  };
  
  const { label, className } = config[audience];
  
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${className}`}>
      {label}
    </span>
  );
}

// Feature availability row
function FeatureRow({ feature }: { feature: TierFeature }) {
  const tier = getFeatureTier(feature);
  const name = FEATURE_NAMES[feature];
  
  // Determine audience based on feature key
  const audience: 'staff' | 'guest' | 'both' = 
    feature.startsWith('guest_portal_') ? 'guest' :
    feature.includes('loyalty') && feature.includes('portal') ? 'guest' :
    ['guest_management_guest_requests', 'notifications_in_app'].includes(feature) ? 'both' :
    'staff';
  
  // Check which tiers have this feature
  const tiers: SubscriptionTier[] = ['ESSENTIAL', 'PROFESSIONAL', 'ELITE'];
  const tierHierarchy = { ESSENTIAL: 1, PROFESSIONAL: 2, ELITE: 3 };
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0 group hover:bg-muted/20 px-2 -mx-2 rounded-lg transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <AudiencePill audience={audience} />
        <span className="text-sm text-foreground truncate">{name}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {tiers.map((t) => {
          const hasAccess = tierHierarchy[t] >= tierHierarchy[tier];
          return hasAccess ? (
            <TierBadge key={t} tier={t} size="xs" />
          ) : null;
        })}
      </div>
    </div>
  );
}

// Mobile dropdown for tabs
function MobileTabSelect({ 
  activeTab, 
  setActiveTab 
}: { 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = TABS.find(t => t.id === activeTab);
  
  return (
    <div className="md:hidden relative mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-card border border-border rounded-xl text-left"
      >
        <div className="flex items-center gap-2">
          {active && <active.icon className="h-4 w-4 text-primary" />}
          <span className="font-medium text-foreground">{active?.label}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-4 py-3 text-left transition-colors ${
                  tab.id === activeTab 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-foreground hover:bg-muted/50'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PricingFeatureBreakdown() {
  const [activeTab, setActiveTab] = useState('guest');
  const activeTabData = TABS.find(t => t.id === activeTab);
  
  // Get categories for active tab
  const categories = activeTabData?.categories || [];
  
  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/3 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What you get
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every feature mapped to its tier. Built from our actual codebase.
          </p>
        </motion.div>

        {/* Mobile dropdown */}
        <MobileTabSelect activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Desktop tabs */}
        <div className="hidden md:flex justify-center gap-2 mb-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tier legend */}
        <div className="flex justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <TierBadge tier="ESSENTIAL" />
            <span className="text-xs text-muted-foreground">$499/mo</span>
          </div>
          <div className="flex items-center gap-2">
            <TierBadge tier="PROFESSIONAL" />
            <span className="text-xs text-muted-foreground">$899/mo</span>
          </div>
          <div className="flex items-center gap-2">
            <TierBadge tier="ELITE" />
            <span className="text-xs text-muted-foreground">$1,499/mo</span>
          </div>
        </div>

        {/* Feature accordions */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden">
            <Accordion type="multiple" defaultValue={categories.map(String)} className="divide-y divide-border/30">
              {categories.map((category) => {
                const features = FEATURE_CATEGORIES[category as keyof typeof FEATURE_CATEGORIES] as readonly TierFeature[];
                const Icon = CATEGORY_ICONS[category] || Settings;
                
                if (!features) return null;
                
                return (
                  <AccordionItem key={category} value={category} className="border-0">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground">{category}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {features.length} features
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <div className="space-y-0">
                        {features.map((feature) => (
                          <FeatureRow key={feature} feature={feature} />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
