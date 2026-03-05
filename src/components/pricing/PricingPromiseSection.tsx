import { Check } from 'lucide-react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';

const PROMISES = [
  'One platform instead of multiple subscriptions',
  'One operational schedule instead of scattered chats',
  'One guest experience instead of mixed tools',
];

export function PricingPromiseSection() {
  return (
    <section className="py-12 md:py-16 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal className="max-w-2xl mx-auto">
          <RevealItem>
            <div className="lagoon-glass rounded-2xl p-6 md:p-8 text-center">
              <h3 className="text-lg md:text-xl font-bold text-foreground mb-5">
                Designed to replace a stack.
              </h3>
              <ul className="space-y-3 inline-block text-left">
                {PROMISES.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {item}
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
