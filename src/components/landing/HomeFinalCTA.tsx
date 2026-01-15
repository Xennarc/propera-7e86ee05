import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';


const reassurancePoints = ['Unlimited staff included', 'Multi-resort ready', 'Elegant by design'];

export function HomeFinalCTA() {
  const { ref, revealed } = useScrollReveal();

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container relative mx-auto px-4 z-10">
          <div
            ref={ref}
            className={`section-reveal max-w-3xl mx-auto text-center ${revealed ? 'section-revealed' : ''}`}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 stagger-1">
              See Propera with your{' '}
              <span className="text-gradient bg-gradient-to-r from-primary via-teal-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
                resort's branding.
              </span>
            </h2>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto stagger-2">
              A calmer operation. A better guest journey. A system your team enjoys using.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 stagger-3">
              <Button asChild size="lg" className="btn-cta-premium text-base px-8 h-14 rounded-xl text-primary-foreground transition-all duration-200 group">
                <Link to="/book-demo">
                  Book a demo
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="btn-ghost-premium text-base px-8 h-14 rounded-xl">
                <Link to="/pricing">View pricing</Link>
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground stagger-4">
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
      </div>
    </section>
  );
}
