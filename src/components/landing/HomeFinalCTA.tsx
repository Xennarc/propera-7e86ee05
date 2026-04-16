import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';

const reassurancePoints = ['Unlimited staff included', 'Multi-resort ready', 'Elegant by design'];

export function HomeFinalCTA() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden border-t border-border/50 bg-gradient-to-b from-transparent to-primary/[0.04]">
      <div className="container relative mx-auto px-4 z-10">
        <ScrollReveal className="max-w-3xl mx-auto text-center">
          <RevealItem>
            <p className="text-[11px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-4">Get Started</p>
            <h2 className="font-serif text-[42px] font-bold leading-[1.05] tracking-[-1px] text-foreground mb-3.5">
              See Propera with your{' '}
              <em className="not-italic text-primary">resort's branding.</em>
            </h2>
          </RevealItem>
          
          <RevealItem>
            <p className="text-[15px] font-light leading-[1.65] text-muted-foreground mb-9 max-w-[300px] mx-auto">
              A calmer operation. A better guest journey. A system your team enjoys using.
            </p>
          </RevealItem>

          <RevealItem className="flex flex-col gap-3 mb-7 px-4">
            <Button asChild size="lg" className="bg-primary text-primary-foreground text-[15px] px-7 h-[52px] rounded-full font-semibold glow-lime transition-all duration-200 group active:scale-[0.98] w-full sm:w-auto sm:mx-auto">
              <Link to="/book-demo">
                Book a demo
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-[15px] px-7 h-[52px] rounded-full border-border/50 hover:border-foreground/20 w-full sm:w-auto sm:mx-auto">
              <Link to="/pricing">View pricing</Link>
            </Button>
          </RevealItem>

          <RevealItem className="flex flex-wrap justify-center gap-x-4 sm:gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {reassurancePoints.map((point) => (
              <span key={point} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary opacity-60" />
                {point}
              </span>
            ))}
          </RevealItem>
        </ScrollReveal>
      </div>
    </section>
  );
}
