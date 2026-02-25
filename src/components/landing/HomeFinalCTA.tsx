import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';

const reassurancePoints = ['Unlimited staff included', 'Multi-resort ready', 'Elegant by design'];

export function HomeFinalCTA() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="container relative mx-auto px-4 z-10">
        <ScrollReveal className="max-w-3xl mx-auto text-center">
          <RevealItem>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-foreground mb-4 md:mb-6">
              See Propera with your{' '}
              <span className="text-gradient bg-gradient-to-r from-primary via-teal-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
                resort's branding.
              </span>
            </h2>
          </RevealItem>
          
          <RevealItem>
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground mb-8 md:mb-10 max-w-2xl mx-auto px-4">
              A calmer operation. A better guest journey. A system your team enjoys using.
            </p>
          </RevealItem>

          <RevealItem className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 md:mb-8 px-4">
            <Button asChild size="lg" className="bg-primary text-primary-foreground text-base px-6 sm:px-8 h-12 sm:h-14 rounded-full font-semibold glow-lime transition-all duration-200 group hover:-translate-y-0.5 w-full sm:w-auto">
              <Link to="/book-demo">
                Book a demo
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base px-6 sm:px-8 h-12 sm:h-14 rounded-full border-border/50 hover:border-primary/30 w-full sm:w-auto">
              <Link to="/pricing">View pricing</Link>
            </Button>
          </RevealItem>

          <RevealItem className="flex flex-wrap justify-center gap-x-4 sm:gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground">
            {reassurancePoints.map((point) => (
              <span key={point} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {point}
              </span>
            ))}
          </RevealItem>
        </ScrollReveal>
      </div>
    </section>
  );
}
