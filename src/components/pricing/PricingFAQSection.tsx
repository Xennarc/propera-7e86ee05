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
    <section className="py-[60px] md:py-[80px] relative overflow-hidden border-t border-border/50">
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <div className="max-w-5xl mx-auto grid md:grid-cols-12 gap-8 md:gap-12">
            {/* Sticky title column */}
            <RevealItem className="md:col-span-4">
              <div className="md:sticky md:top-28">
                <p className="text-[11px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-4">
                  Questions
                </p>
                <h2 className="font-serif text-[34px] md:text-[42px] font-bold leading-[1.0] tracking-[-1.2px] text-foreground">
                  Common questions.
                </h2>
              </div>
            </RevealItem>

            {/* FAQ list — clean hairline-separated rows, no cards */}
            <RevealItem className="md:col-span-8">
              <dl className="border-t border-border/40">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="border-b border-border/40 py-6 first:pt-7"
                  >
                    <dt className="font-serif text-[20px] md:text-[22px] tracking-tight text-foreground leading-snug mb-2.5">
                      {faq.question}
                    </dt>
                    <dd className="text-[14.5px] text-muted-foreground leading-[1.65]">
                      {faq.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </RevealItem>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
