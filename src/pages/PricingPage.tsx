import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEOHead, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { LogIn, Menu, X, Check, Users, Building2, MessageCircle, ArrowRight, Zap, Globe, RefreshCw, Mail, Plug, BarChart3, Headphones, FileEdit } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const PRICING_PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Propera Pricing',
  description: 'Simple, resort-friendly pricing for Propera — guest portal + staff console for activities, spa, restaurants, and excursions.',
  url: 'https://propera.cc/pricing',
};

const PLANS = [
  {
    id: 'essential',
    name: 'Essential',
    price: '$499',
    unit: 'per resort / month',
    tagline: 'For boutique resorts launching a clean digital booking experience.',
    features: [
      'Guest Portal + Staff Console',
      'Activities, Excursions & Spa bookings',
      'Guest profiles + pre-arrival details',
      'Live availability + capacity controls',
      'Email notifications (via your configured sender)',
      'Standard support',
    ],
    usage: 'Includes up to 1,500 guest stays / month',
    overage: 'Overage: $0.10 per guest stay',
    cta: 'Start with Essential',
    ctaVariant: 'outline' as const,
    popular: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$899',
    unit: 'per resort / month',
    tagline: 'Our most popular plan for full resort operations.',
    includesLine: 'Everything in Essential, plus',
    features: [
      'Restaurant bookings + request routing',
      'Department views for smoother daily ops',
      'Advanced scheduling controls (sessions, time slots, limits)',
      'Role-based access (so not everyone becomes admin)',
      'Analytics: bookings, utilization, cancellations',
    ],
    usage: 'Includes up to 3,000 guest stays / month',
    overage: 'Overage: $0.08 per guest stay',
    cta: 'Choose Professional',
    ctaVariant: 'default' as const,
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$1,499',
    unit: 'per resort / month',
    tagline: 'For high-volume resorts and groups that want premium control.',
    includesLine: 'Everything in Professional, plus',
    features: [
      'Enhanced white-label branding options',
      'Priority support + faster response times',
      'Advanced analytics + performance reporting',
      'Integration readiness (API/webhooks available)',
      'Optional SLA packages',
    ],
    usage: 'Includes up to 6,000 guest stays / month',
    overage: 'Overage: $0.06 per guest stay',
    cta: 'Talk to Sales',
    ctaVariant: 'outline' as const,
    popular: false,
  },
];

const TRUST_ITEMS = [
  { icon: Users, text: 'Unlimited staff users' },
  { icon: Building2, text: 'Multi-resort ready' },
  { icon: RefreshCw, text: 'Guest + Staff portals in sync' },
  { icon: Mail, text: 'Email notifications included' },
];

const ADDONS = [
  {
    icon: Plug,
    title: 'Integrations Pack',
    price: 'from $300 / month',
    description: 'PMS/POS/CRM, API & webhooks.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Plus',
    price: '$199 / month',
    description: 'Executive dashboards & deeper insights.',
  },
  {
    icon: Headphones,
    title: 'Premium Support',
    price: '$199 / month',
    description: 'Priority channels & extended coverage.',
  },
  {
    icon: FileEdit,
    title: 'Managed Content',
    price: 'from $150 / month',
    description: 'We maintain your activity catalog & seasonal updates.',
  },
];

const FAQS = [
  {
    question: 'Do you charge per staff user?',
    answer: "No — unlimited staff on every plan. Resorts shouldn't be punished for being staffed.",
  },
  {
    question: 'What is a "guest stay"?',
    answer: 'One guest reservation/stay counted once for the month. It keeps pricing fair as occupancy changes.',
  },
  {
    question: 'Can guests book from their phones?',
    answer: 'Yes — Propera is mobile-first and designed for real resort Wi-Fi.',
  },
  {
    question: 'Can we start with one resort and expand?',
    answer: 'Absolutely. Many groups roll out property-by-property after the first resort proves ROI.',
  },
];

export default function PricingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToPlans = () => {
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Propera Pricing"
        description="Simple, resort-friendly pricing for Propera — guest portal + staff console for activities, spa, restaurants, and excursions."
        canonicalUrl="/pricing"
        keywords="resort booking pricing, hotel booking software pricing, resort management plans, guest portal pricing"
        structuredData={[PROPERA_ORGANIZATION_SCHEMA, PRICING_PAGE_SCHEMA]}
      />

      {/* Header - matching landing page */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between" aria-label="Main navigation">
          <Link to="/" className="flex items-center gap-3">
            <ProperaMark size={40} className="text-primary" />
            <span className="text-xl font-bold text-foreground tracking-tight">Propera</span>
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/#product-tour" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Product
            </Link>
            <Link to="/pricing" className="text-sm text-foreground font-medium">
              Pricing
            </Link>
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <Button asChild variant="ghost" size="sm">
              <Link to="/guest/login">
                Guest Portal
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-full px-5 font-semibold">
              <Link to="/auth">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Link>
            </Button>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </nav>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-b border-border/30 py-4">
            <div className="container mx-auto px-4 flex flex-col gap-4">
              <Link 
                to="/#product-tour" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Product
              </Link>
              <Link 
                to="/pricing" 
                className="text-sm text-foreground font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link 
                to="/about" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <hr className="border-border/30" />
              <Link 
                to="/guest/login" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Guest Portal
              </Link>
              <Button asChild size="sm" className="w-full">
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
            <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-400/10 rounded-full blur-[100px] pointer-events-none" />
          </div>

          <div className="container relative mx-auto px-6 max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 border border-primary/20"
              >
                <Zap className="h-4 w-4" />
                Simple, transparent pricing
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight">
                Pricing
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed">
                Built for island resorts. Priced to scale with you.
              </p>
              
              <p className="text-sm text-muted-foreground/70 mb-8">
                Unlimited staff users included on every plan. No seat-based pricing.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-base px-8 h-14 rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all group">
                  <Link to="/auth">
                    Book a demo
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="text-base px-8 h-14 rounded-xl hover:bg-primary/5" onClick={scrollToPlans}>
                  Compare plans
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* PLANS SECTION */}
        <section id="plans" className="py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {PLANS.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`relative h-full flex flex-col p-6 md:p-8 transition-all duration-300 ${
                    plan.popular 
                      ? 'border-primary/50 ring-2 ring-primary/20 shadow-lg' 
                      : 'border-border/50 hover:border-border'
                  }`}>
                    {/* Popular badge */}
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold shadow-md">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    
                    {/* Header gradient strip for popular plan */}
                    {plan.popular && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-teal-400 to-primary rounded-t-lg" />
                    )}

                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.unit}</p>
                    </div>

                    <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                      {plan.tagline}
                    </p>

                    <Separator className="mb-6" />

                    {/* Features */}
                    <div className="flex-1">
                      {plan.includesLine && (
                        <p className="text-xs font-medium text-primary mb-3">{plan.includesLine}</p>
                      )}
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Usage info */}
                    <div className="bg-muted/30 rounded-lg p-3 mb-6">
                      <p className="text-xs text-muted-foreground">{plan.usage}</p>
                      <p className="text-xs text-muted-foreground/70">{plan.overage}</p>
                    </div>

                    {/* CTA */}
                    <Button 
                      asChild 
                      variant={plan.ctaVariant} 
                      className={`w-full rounded-xl h-12 font-semibold ${
                        plan.popular ? 'shadow-md' : ''
                      }`}
                    >
                      <Link to={plan.id === 'enterprise' ? 'mailto:hello@propera.cc' : '/auth'}>
                        {plan.cta}
                      </Link>
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="py-8 border-y border-border/30 bg-muted/20">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
              {TRUST_ITEMS.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  <span>{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ADD-ONS SECTION */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Add-ons</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Extend your Propera setup with additional capabilities.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {ADDONS.map((addon, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-5 flex items-start gap-4 border-border/50 hover:border-border transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <addon.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-foreground">{addon.title}</h4>
                        <span className="text-sm font-medium text-primary whitespace-nowrap">{addon.price}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{addon.description}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ONBOARDING SECTION */}
        <section className="py-16 md:py-20 bg-muted/20">
          <div className="container mx-auto px-6 max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Onboarding & Setup</h2>
              <p className="text-lg font-medium text-primary mb-4">$2,500 – $7,500 per resort (one-time)</p>
              <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Includes resort setup, branding guidance, activity catalog setup, staff training, and a full test run before launch.
              </p>
            </motion.div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Frequently asked questions</h2>
            </motion.div>

            <Accordion type="single" collapsible className="space-y-3">
              {FAQS.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AccordionItem 
                    value={`faq-${index}`}
                    className="bg-card rounded-xl border border-border/50 px-6 overflow-hidden transition-all duration-200 hover:border-primary/30 data-[state=open]:border-primary/30"
                  >
                    <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                      <span className="pr-4">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </div>
        </section>

        {/* FINAL CTA SECTION */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="relative p-8 md:p-12 text-center border-primary/30 bg-gradient-to-br from-primary/5 via-background to-teal-400/5 overflow-hidden">
                {/* Subtle gradient border effect */}
                <div className="absolute inset-0 rounded-lg border border-primary/20" />
                
                <div className="relative z-10">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                    Ready to see Propera in action?
                  </h2>
                  <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                    We'll walk through a real guest booking flow + staff operations in under 15 minutes.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" className="text-base px-8 h-14 rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all group">
                      <Link to="/auth">
                        Book a demo
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="lg" className="text-base px-8 h-14 rounded-xl hover:bg-primary/5" asChild>
                      <a href="mailto:hello@propera.cc">
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Contact sales
                      </a>
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer - matching landing page */}
      <footer className="py-12 bg-card border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link to="/" className="flex items-center gap-3 mb-4">
                <ProperaMark size={36} className="text-primary" />
                <span className="font-bold text-foreground">Propera</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                The operating system for world-class resort stays.
              </p>
            </div>
            
            {/* Product */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/#product-tour" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link to="/guest/login" className="hover:text-foreground transition-colors">Guest Portal</Link></li>
              </ul>
            </div>
            
            {/* Company */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><a href="mailto:hello@propera.cc" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            
            {/* Get Started */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Get Started</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/auth" className="hover:text-foreground transition-colors">Sign In</Link></li>
                <li><Link to="/guest/find" className="hover:text-foreground transition-colors">Find Your Resort</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Propera. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
