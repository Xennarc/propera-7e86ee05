import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';

const REASSURANCE_CHIPS = [
  'Unlimited staff included',
  'Multi-resort ready',
  'Elegant by design',
];

export function PricingCTASection() {
  return (
    <section className="py-[60px] relative overflow-hidden border-t border-border/50 bg-gradient-to-b from-transparent to-primary/[0.04]">
      <div className="container relative mx-auto px-4 z-10">
        <ScrollReveal className="max-w-3xl mx-auto text-center">
          <RevealItem>
            <p className="text-[11px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-4">Get Started</p>
            <h2 className="font-serif text-[42px] font-bold leading-[1.05] tracking-[-1px] text-foreground mb-3.5">
              Ready to see Propera with your{' '}
              <em className="not-italic text-primary">resort?</em>
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="text-[15px] font-light leading-[1.65] text-muted-foreground mb-9 max-w-[300px] mx-auto">
              A calmer operation. A better guest journey. A system your team enjoys using.
            </p>
          </RevealItem>

          <RevealItem className="flex flex-col gap-3 mb-7 px-4">
            <Link
              to="/book-demo"
              className="inline-flex items-center justify-center bg-primary text-primary-foreground text-[15px] px-7 h-[52px] rounded-full font-semibold glow-lime transition-all duration-200 group active:scale-[0.98] w-full sm:w-auto sm:mx-auto"
            >
              Book a demo
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="mailto:hello@propera.io?subject=Sales Inquiry"
              className="inline-flex items-center justify-center text-[15px] px-7 h-[52px] rounded-full border border-border/50 hover:border-foreground/20 text-foreground font-semibold transition-all duration-200 active:scale-[0.98] w-full sm:w-auto sm:mx-auto"
            >
              Contact sales
            </a>
          </RevealItem>

          <RevealItem className="flex flex-wrap justify-center gap-x-4 sm:gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {REASSURANCE_CHIPS.map((chip) => (
              <span key={chip} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary opacity-60" />
                {chip}
              </span>
            ))}
          </RevealItem>
        </ScrollReveal>
      </div>
    </section>
  );
}
