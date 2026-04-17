import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';

export function PricingCTASection() {
  return (
    <section className="py-[80px] md:py-[120px] relative overflow-hidden border-t border-border/50">
      {/* Subtle ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/[0.05] rounded-full blur-[140px] pointer-events-none hidden sm:block" />

      <div className="container relative mx-auto px-4 z-10">
        <ScrollReveal className="max-w-3xl mx-auto text-center">
          <RevealItem>
            <h2 className="font-serif text-[40px] sm:text-[52px] md:text-[64px] font-black leading-[1.0] tracking-[-1.5px] text-foreground mb-10">
              See Propera with{' '}
              <em className="not-italic text-primary">your resort.</em>
            </h2>
          </RevealItem>

          <RevealItem className="flex flex-col sm:flex-row gap-3.5 justify-center px-4">
            <Link
              to="/book-demo"
              className="inline-flex items-center justify-center bg-primary text-primary-foreground text-[15px] px-7 h-[56px] rounded-full font-semibold glow-lime transition-all duration-200 group active:scale-[0.98] w-full sm:w-auto hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
            >
              Book a demo
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="mailto:hello@propera.io?subject=Sales Inquiry"
              className="inline-flex items-center justify-center text-[15px] px-7 h-[56px] rounded-full border border-border/50 hover:border-foreground/30 text-foreground font-semibold transition-all duration-200 active:scale-[0.98] w-full sm:w-auto"
            >
              Contact sales
            </a>
          </RevealItem>
        </ScrollReveal>
      </div>
    </section>
  );
}
