import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';


const reassurancePoints = ['Unlimited staff included', 'Multi-resort ready', 'Elegant by design'];

export function HomeFinalCTA() {
  const { ref, revealed } = useScrollReveal();

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="container relative mx-auto px-4 z-10">
          <div
            ref={ref}
            className={`section-reveal max-w-3xl mx-auto text-center ${revealed ? 'section-revealed' : ''}`}
          >
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-foreground mb-4 md:mb-6 stagger-1">
              See Propera with your{' '}
              <span className="text-gradient bg-gradient-to-r from-primary via-teal-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
                resort's branding.
              </span>
            </h2>
            
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground mb-8 md:mb-10 max-w-2xl mx-auto px-4 stagger-2">
              A calmer operation. A better guest journey. A system your team enjoys using.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 md:mb-8 stagger-3 px-4">
              <Button asChild size="lg" className="bg-primary text-primary-foreground text-base px-6 sm:px-8 h-12 sm:h-14 rounded-full font-semibold glow-lime transition-all duration-200 group hover:-translate-y-0.5 active:scale-[0.97] w-full sm:w-auto">
                <Link to="/book-demo">
                  Book a demo
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base px-6 sm:px-8 h-12 sm:h-14 rounded-full border-border/50 hover:border-primary/30 active:scale-[0.97] w-full sm:w-auto">
                <Link to="/pricing">View pricing</Link>
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-x-4 sm:gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground stagger-4">
              {reassurancePoints.map((point) => (
                <span
                  key={point}
                  className="flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {point}
                </span>
              ))}
            </div>
          </div>
        </div>
    </section>
  );
}
