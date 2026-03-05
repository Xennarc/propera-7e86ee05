import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';

const REASSURANCE_CHIPS = [
  'Unlimited staff included',
  'Multi-resort ready',
  'Elegant by design',
];

export function PricingCTASection() {
  return (
    <section className="relative overflow-hidden pb-[env(safe-area-inset-bottom,0px)]">
      <div className="py-20 md:py-28 cta-spotlight atlas-texture">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 dark:from-primary/8 via-background to-teal-400/12 dark:to-teal-400/6" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/15 dark:bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-teal-400/12 dark:bg-teal-400/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="container relative mx-auto px-4 z-10">
          <ScrollReveal className="max-w-2xl mx-auto text-center">
            <RevealItem>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
                Ready to see Propera with your resort?
              </h2>
            </RevealItem>
            <RevealItem>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                A calmer operation. A better guest journey. A system your team enjoys using.
              </p>
            </RevealItem>
            
            <RevealItem className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Button asChild size="lg" className="bg-primary text-primary-foreground rounded-full font-semibold h-12 min-h-[48px] px-8 glow-lime group hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.97] w-full sm:w-auto">
                <Link to="/book-demo">
                  Book a demo
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full font-semibold h-12 min-h-[48px] px-8 border-border/50 hover:border-primary/30 active:scale-[0.97] transition-all w-full sm:w-auto">
                <a href="mailto:hello@propera.io?subject=Sales Inquiry">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contact sales
                </a>
              </Button>
            </RevealItem>

            <RevealItem className="flex flex-wrap items-center justify-center gap-4">
              {REASSURANCE_CHIPS.map((chip) => (
                <span 
                  key={chip}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {chip}
                </span>
              ))}
            </RevealItem>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
