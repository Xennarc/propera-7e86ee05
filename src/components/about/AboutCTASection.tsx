import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Building2, Users } from 'lucide-react';

export function AboutCTASection() {
  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* For Resorts */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative group"
          >
            <div className="bg-card rounded-2xl border border-border/50 p-8 h-full relative overflow-hidden">
              {/* Background visual */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10 group-hover:opacity-20 transition-opacity">
                <div className="absolute inset-0">
                  <div className="h-full w-full rounded-lg border border-foreground/20" />
                  <div className="absolute top-2 left-2 right-2 h-4 rounded bg-foreground/10" />
                  <div className="absolute top-8 left-2 right-2 h-2 rounded bg-foreground/10" />
                  <div className="absolute top-12 left-2 right-2 h-2 rounded bg-foreground/10" />
                </div>
              </div>
              
              <div className="relative z-10">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">For resort teams</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  See how Propera can transform your operations and guest experience. Let's talk about your properties.
                </p>
                <Button asChild size="lg" className="rounded-full font-semibold">
                  <a href="mailto:hello@propera.cc?subject=Demo Request">
                    Talk to us about your properties
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* For Talent */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative group"
          >
            <div className="bg-card rounded-2xl border border-border/50 p-8 h-full relative overflow-hidden">
              {/* Background visual */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10 group-hover:opacity-20 transition-opacity">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full border border-foreground/20" />
                  <div className="absolute h-12 w-12 rounded-full border border-foreground/15" />
                  <div className="absolute h-8 w-8 rounded-full border border-foreground/10" />
                </div>
              </div>
              
              <div className="relative z-10">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                  <Users className="h-6 w-6 text-accent-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">For builders</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Love hospitality tech? Want to build products that change how resorts operate? We'd love to hear from you.
                </p>
                <Button asChild variant="outline" size="lg" className="rounded-full font-semibold">
                  <a href="mailto:careers@propera.cc?subject=Joining Propera">
                    Build Propera with us
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
