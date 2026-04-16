import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const VALUE_CHIPS = [
  'Unlimited staff',
  'Multi-resort ready',
  'Real-time sync',
  'White-label capable',
];

export function PricingHeroSection() {
  const scrollToPlans = () => {
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[60vh] flex items-center overflow-hidden pt-20 md:pt-28 pb-12 md:pb-16 bg-background">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/[0.03]" />
      
      {/* Subtle glows - hidden on mobile */}
      <div className="absolute top-20 right-1/4 w-[600px] h-[600px] bg-primary/6 rounded-full blur-[150px] pointer-events-none hidden sm:block" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-teal-400/4 rounded-full blur-[130px] pointer-events-none hidden sm:block" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[11px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-4">Pricing</p>
          
          <h1 className="font-serif text-[42px] sm:text-[52px] md:text-[62px] font-black leading-[1.0] tracking-[-1.5px] text-foreground mb-4 md:mb-6">
            Replace your{' '}
            <em className="not-italic text-primary">resort stack.</em>
          </h1>
          
          <p className="text-base font-light leading-[1.65] text-muted-foreground max-w-xl mx-auto mb-3 md:mb-4">
            Pre-arrival, bookings, transport, dining, room service, housekeeping requests, loyalty, and department operations — in one calm system.
          </p>

          <p className="text-sm text-muted-foreground/70 max-w-xl mx-auto mb-8">
            One source of truth from guest tap → team schedule.
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-3.5 mb-7 px-4">
            <Link
              to="/book-demo"
              className="inline-flex items-center justify-center bg-primary text-primary-foreground text-[16px] px-7 h-[56px] rounded-full font-semibold glow-lime transition-all duration-200 group active:scale-[0.98] w-full sm:w-auto sm:mx-auto hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
            >
              Book a demo
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button
              onClick={scrollToPlans}
              className="inline-flex items-center justify-center text-[16px] px-7 h-[56px] rounded-full font-semibold border border-border/50 hover:border-foreground/20 bg-transparent text-foreground transition-all duration-200 active:scale-[0.98] w-full sm:w-auto sm:mx-auto"
            >
              Compare plans
            </button>
          </div>

          {/* Value chips */}
          <div className="flex flex-wrap justify-center gap-x-4 sm:gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {VALUE_CHIPS.map((chip) => (
              <span key={chip} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary opacity-60" />
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
