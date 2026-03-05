import { HelpCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
    <section className="py-16 md:py-20 bg-gradient-to-b from-card via-card to-primary/5 dark:from-card dark:via-card dark:to-card relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/8 dark:from-primary/4 via-transparent to-transparent" />
      <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-teal-400/10 dark:bg-teal-400/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <RevealItem className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <HelpCircle className="h-4 w-4" />
              Questions
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
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
              <Button asChild size="sm" className="bg-primary text-primary-foreground rounded-full font-semibold glow-lime">
                <Link to="/book-demo">
                  Book a demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </RevealItem>
        </ScrollReveal>
      </div>
    </section>
  );
}
