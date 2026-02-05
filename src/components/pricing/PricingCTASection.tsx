import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle } from 'lucide-react';

import { useScrollReveal } from '@/hooks/useScrollReveal';

const REASSURANCE_CHIPS = [
  'Unlimited staff included',
  'Multi-resort ready',
  'Feature flags per resort',
];

export function PricingCTASection() {
  const { ref, revealed } = useScrollReveal();

  return (
    <section className="relative overflow-hidden">
      <div className="py-20 md:py-28 cta-spotlight atlas-texture">
        {/* Enhanced background for light mode */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 dark:from-primary/8 via-background to-teal-400/12 dark:to-teal-400/6" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/15 dark:bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-teal-400/12 dark:bg-teal-400/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="container relative mx-auto px-4 z-10">
          <div
            ref={ref}
            className={`section-reveal max-w-2xl mx-auto text-center ${revealed ? 'section-revealed' : ''}`}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight stagger-1">
              Ready to see Propera with your resort?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed stagger-2">
              Guest Portal, Staff Console, Transport, Analytics — one platform your team and guests will actually use.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 stagger-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground rounded-full font-semibold h-12 px-8 glow-lime group hover:-translate-y-0.5 transition-all">
                <Link to="/book-demo">
                  Book a demo
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full font-semibold h-12 px-8 border-border/50 hover:border-primary/30">
                <a href="mailto:hello@propera.io?subject=Sales Inquiry">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contact sales
                </a>
              </Button>
            </div>

            {/* Reassurance chips */}
            <div className="flex flex-wrap items-center justify-center gap-4 stagger-4">
              {REASSURANCE_CHIPS.map((chip) => (
                <span 
                  key={chip}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
