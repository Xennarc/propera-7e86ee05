import { ShieldCheck, Sun, Rocket, Package } from 'lucide-react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';

const SWITCH_CARDS = [
  {
    icon: ShieldCheck,
    title: 'Stack-Swap Guarantee',
    body: "If you're consolidating tools, we'll beat your current monthly software total by 15 % for 12 months on Professional or Elite.",
    footnote: 'Applies when replacing multiple systems. We verify via invoices.',
  },
  {
    icon: Sun,
    title: 'Seasonal Flex',
    body: 'Resorts can downgrade for low season and scale back up anytime — without losing data or setup.',
  },
  {
    icon: Rocket,
    title: 'Go-Live Support',
    body: 'Optional premium onboarding for menus, services, and staff training — so teams adopt fast.',
  },
];

const ADDON_ITEMS = [
  { label: 'Integrations Pack', detail: 'PMS / POS / menus / payments (priced by depth)' },
  { label: 'Messaging Pack', detail: 'SMS / WhatsApp routing (pass-through + platform fee)' },
  { label: 'Premium onboarding', detail: 'Data migration + training (one-time)' },
];

export function PricingSwitchSection() {
  return (
    <section className="py-16 md:py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-midnight-900/20 to-background dark:via-midnight-950/40" />
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <RevealItem className="text-center mb-8 md:mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Make the switch painless.
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Switching platforms shouldn't feel like a risk. We designed it not to.
            </p>
          </RevealItem>

          {/* Switch cards */}
          <div className="grid sm:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto mb-14">
            {SWITCH_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <RevealItem key={card.title}>
                  <div className="lagoon-glass rounded-2xl p-5 md:p-6 h-full flex flex-col">
                    <div className="icon-orb-gradient h-10 w-10 mb-4 flex items-center justify-center rounded-xl">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2 text-sm md:text-base">
                      {card.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                      {card.body}
                    </p>
                    {card.footnote && (
                      <p className="text-[11px] text-muted-foreground/60 mt-3 pt-3 border-t border-border/20">
                        {card.footnote}
                      </p>
                    )}
                  </div>
                </RevealItem>
              );
            })}
          </div>

          {/* Add-ons mini list */}
          <RevealItem className="max-w-2xl mx-auto">
            <div className="lagoon-glass rounded-2xl p-5 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Add-ons (optional)</h3>
              </div>
              <ul className="space-y-3">
                {ADDON_ITEMS.map((item) => (
                  <li key={item.label} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground">— {item.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </RevealItem>
        </ScrollReveal>
      </div>
    </section>
  );
}
