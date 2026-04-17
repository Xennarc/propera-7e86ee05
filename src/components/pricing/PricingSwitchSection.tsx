import { ShieldCheck, Sun, Rocket } from 'lucide-react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';

const SWITCH_CARDS = [
  {
    icon: ShieldCheck,
    title: 'Stack-Swap Guarantee',
    body: "If you're consolidating tools, we'll beat your current monthly software total by 15% for 12 months on Professional or Elite.",
    footnote: 'Applies when replacing multiple systems. We verify via invoices.',
  },
  {
    icon: Sun,
    title: 'Seasonal Flex',
    body: 'Downgrade for low season and scale back up anytime — without losing data or setup.',
    footnote: null,
  },
  {
    icon: Rocket,
    title: 'Go-Live Support',
    body: 'Optional premium onboarding for menus, services, and staff training — so teams adopt fast.',
    footnote: null,
  },
];

const ADDON_ITEMS = [
  { label: 'Integrations Pack', detail: 'PMS / POS / menus / payments (priced by depth)' },
  { label: 'Messaging Pack', detail: 'SMS / WhatsApp routing (pass-through + platform fee)' },
  { label: 'Premium onboarding', detail: 'Data migration + training (one-time)' },
];

export function PricingSwitchSection() {
  return (
    <section className="py-[60px] md:py-[80px] relative overflow-hidden border-t border-border/50">
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <RevealItem className="max-w-3xl mb-12 md:mb-14">
            <p className="text-[11px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-4">
              Switching
            </p>
            <h2 className="font-serif text-[32px] md:text-[42px] font-bold leading-[1.05] tracking-[-1.2px] text-foreground mb-4">
              Make the switch painless.
            </h2>
            <p className="text-[15px] font-light leading-[1.65] text-muted-foreground max-w-lg">
              Switching platforms shouldn't feel like a risk. We designed it not to.
            </p>
          </RevealItem>

          {/* Three editorial blocks — separated by hairlines, not cards */}
          <div className="grid sm:grid-cols-3 gap-px bg-border/40 max-w-5xl mb-16 md:mb-20 rounded-2xl overflow-hidden">
            {SWITCH_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <RevealItem key={card.title}>
                  <div className="bg-background p-6 md:p-7 h-full flex flex-col">
                    <Icon className="h-5 w-5 text-primary mb-5" strokeWidth={1.75} />
                    <h3 className="font-serif text-xl tracking-tight text-foreground mb-2.5">
                      {card.title}
                    </h3>
                    <p className="text-[14px] text-muted-foreground leading-[1.65] flex-1">
                      {card.body}
                    </p>
                    {card.footnote && (
                      <p className="text-[11px] text-muted-foreground/60 mt-4 pt-4 border-t border-border/30 leading-relaxed">
                        {card.footnote}
                      </p>
                    )}
                  </div>
                </RevealItem>
              );
            })}
          </div>

          {/* Add-ons — clean inline list */}
          <RevealItem className="max-w-2xl">
            <p className="text-[11px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-5">
              Add-ons (optional)
            </p>
            <dl className="border-t border-border/40">
              {ADDON_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col sm:flex-row sm:items-baseline sm:gap-4 py-4 border-b border-border/30"
                >
                  <dt className="text-sm font-medium text-foreground sm:w-44 sm:flex-shrink-0">
                    {item.label}
                  </dt>
                  <dd className="text-sm text-muted-foreground leading-relaxed">{item.detail}</dd>
                </div>
              ))}
            </dl>
          </RevealItem>
        </ScrollReveal>
      </div>
    </section>
  );
}
