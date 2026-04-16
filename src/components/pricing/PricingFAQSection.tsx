import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';

interface FAQ {
  question: string;
  answer: string;
}

interface PricingFAQSectionProps {
  faqs: FAQ[];
}

export function PricingFAQSection({ faqs }: PricingFAQSectionProps) {
  return (
    <section className="py-[60px] relative overflow-hidden border-t border-border/50">
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <RevealItem className="text-center mb-10">
            <p className="text-[11px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-4">Questions</p>
            <h2 className="font-serif text-[32px] md:text-[38px] font-bold leading-[1.05] tracking-[-1px] text-foreground mb-3">
              Common questions
            </h2>
          </RevealItem>

          <RevealItem className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index}
                  value={`faq-${index}`}
                  className="lagoon-glass-subtle rounded-xl px-5 overflow-hidden transition-all duration-200 hover:border-primary/20 data-[state=open]:border-primary/30 data-[state=open]:bg-card/80"
                >
                  <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4 text-sm [&[data-state=open]>svg]:rotate-180">
                    <span className="pr-4">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            
            <div className="mt-10 lagoon-glass p-6 rounded-2xl text-center">
              <h3 className="font-semibold text-foreground mb-2">Not sure which plan fits?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tell us your resort size and departments — we'll recommend the best fit.
              </p>
              <Link
                to="/book-demo"
                className="inline-flex items-center justify-center bg-primary text-primary-foreground text-sm px-6 h-[44px] rounded-full font-semibold glow-lime transition-all duration-200 active:scale-[0.98] hover:-translate-y-0.5"
              >
                Book a demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </RevealItem>
        </ScrollReveal>
      </div>
    </section>
  );
}
