import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEOHead, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { 
  LogIn, Menu, X, Check, Users, Building2, MessageCircle, ArrowRight, 
  Zap, Globe, RefreshCw, Mail, Plug, BarChart3, Headphones, FileEdit,
  Sparkles, Shield, Smartphone, Clock, ChevronRight, XIcon,
  UtensilsCrossed, Activity, Palette, Eye, LayoutGrid, Lock, Waves
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    recommendedFor: 'Boutique resorts & soft launches',
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
    recommendedFor: 'Full operations across departments',
    includesLine: 'Everything in Essential, plus',
    features: [
      'Restaurant bookings + request routing',
      'Department views for smoother daily ops',
      'Advanced scheduling controls (sessions, time slots, limits)',
      'Role-based access (so not everyone becomes admin)',
      'Analytics: bookings, utilization, cancellations',
    ],
    whyChoose: [
      'Restaurants + Activities in one hub',
      'Role-based access',
      'Utilization analytics',
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
    recommendedFor: 'High-volume resorts & multi-property groups',
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
  { icon: Users, text: 'Unlimited staff' },
  { icon: Building2, text: 'Multi-resort ready' },
  { icon: RefreshCw, text: 'Real-time sync' },
  { icon: Palette, text: 'White-label capable' },
];

const COMPARISON_FEATURES = [
  { name: 'Guest Portal', essential: true, professional: true, enterprise: true },
  { name: 'Staff Console', essential: true, professional: true, enterprise: true },
  { name: 'Activities / Excursions / Spa', essential: true, professional: true, enterprise: true },
  { name: 'Restaurants', essential: false, professional: true, enterprise: true },
  { name: 'Analytics', essential: false, professional: true, enterprise: true },
  { name: 'White-label options', essential: false, professional: false, enterprise: true },
  { name: 'Priority support', essential: false, professional: false, enterprise: true },
];

const TRUST_CARDS = [
  {
    icon: Eye,
    title: 'Operational clarity',
    description: 'Schedules, capacity, and bookings in one place.',
  },
  {
    icon: Smartphone,
    title: 'Guest-friendly',
    description: 'Mobile-first flows that reduce front-desk calls.',
  },
  {
    icon: RefreshCw,
    title: 'Reliable sync',
    description: 'Staff + guest views stay consistent in real time.',
  },
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

const ONBOARDING_STEPS = [
  { step: 1, title: 'Resort setup', description: 'Configure your property' },
  { step: 2, title: 'Catalog + branding', description: 'Set up activities & style' },
  { step: 3, title: 'Training + launch test', description: 'Go live with confidence' },
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

// Product preview mock data
const GUEST_PORTAL_ITEMS = ['Snorkel Safari', 'Sunset Cruise', 'Couples Massage'];
const STAFF_CONSOLE_STATS = [
  { label: 'Today', value: '18 bookings' },
  { label: 'Upcoming', value: '6 sessions' },
  { label: 'Requests', value: '3' },
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
        {/* HERO SECTION - Premium 2-column layout */}
        <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
          {/* Premium Background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/3" />
            {/* Radial glow behind headline */}
            <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[120px]" />
            <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-teal-400/5 rounded-full blur-[100px]" />
          </div>

          <div className="container relative mx-auto px-6 max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Left: Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="motion-reduce:transform-none"
              >
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 bg-primary/8 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8 border border-primary/15 backdrop-blur-sm motion-reduce:transform-none"
                >
                  <Sparkles className="h-4 w-4" />
                  Simple, transparent pricing
                </motion.div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-[1.08] tracking-tight">
                  Pricing
                </h1>
                
                <p className="text-xl md:text-2xl text-muted-foreground mb-3 leading-relaxed max-w-lg">
                  Built for island resorts. Priced to scale with you.
                </p>
                
                <p className="text-sm text-muted-foreground/80 mb-10 max-w-md">
                  Unlimited staff users included on every plan. No seat-based pricing.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-10">
                  <Button asChild size="lg" className="text-base px-8 h-14 rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 motion-reduce:transition-none group">
                    <Link to="/auth">
                      Book a demo
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform motion-reduce:transform-none" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" className="text-base px-8 h-14 rounded-xl border-border/60 hover:bg-muted/50 hover:border-border transition-all duration-300 motion-reduce:transition-none" onClick={scrollToPlans}>
                    Compare plans
                  </Button>
                </div>

                {/* Value Chips */}
                <div className="flex flex-wrap gap-2.5">
                  {TRUST_ITEMS.map((item, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="px-3.5 py-2 text-xs font-medium bg-card/80 backdrop-blur-sm text-muted-foreground border border-border/40 rounded-full hover:border-border/60 transition-colors motion-reduce:transition-none"
                    >
                      <item.icon className="h-3.5 w-3.5 mr-2 text-primary/80" />
                      {item.text}
                    </Badge>
                  ))}
                </div>
              </motion.div>

              {/* Right: Product Preview Panel */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="hidden lg:block motion-reduce:transform-none"
              >
                <div className="relative">
                  {/* Glassy background effect */}
                  <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 via-transparent to-teal-400/5 rounded-3xl blur-2xl pointer-events-none" />
                  
                  <Card className="relative overflow-hidden border-border/40 bg-card/90 backdrop-blur-md shadow-2xl shadow-primary/5">
                    {/* Mac-style window header */}
                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/40 bg-muted/20">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-destructive/50" />
                        <div className="w-3 h-3 rounded-full bg-warning/50" />
                        <div className="w-3 h-3 rounded-full bg-success/50" />
                      </div>
                      <span className="text-xs text-muted-foreground/80 ml-3 font-medium">Propera Dashboard</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] px-2 py-0.5 bg-muted/50 border-border/30">Example</Badge>
                    </div>

                    <div className="p-6 space-y-5">
                      {/* Guest Portal Section */}
                      <div>
                        <div className="flex items-center gap-2.5 mb-4">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Globe className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-semibold text-foreground">Guest Portal</span>
                        </div>
                        <div className="space-y-2.5">
                          {GUEST_PORTAL_ITEMS.map((item, i) => (
                            <div 
                              key={i} 
                              className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/20 hover:bg-muted/40 transition-colors motion-reduce:transition-none"
                            >
                              <span className="text-sm text-foreground font-medium">{item}</span>
                              <Badge variant="secondary" className="text-[10px] bg-success/10 text-success border-success/20">Available</Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator className="bg-border/30" />

                      {/* Staff Console Section */}
                      <div>
                        <div className="flex items-center gap-2.5 mb-4">
                          <div className="w-7 h-7 rounded-lg bg-lagoon-500/10 flex items-center justify-center">
                            <LayoutGrid className="h-4 w-4 text-lagoon-500" />
                          </div>
                          <span className="text-sm font-semibold text-foreground">Staff Console</span>
                          <Badge variant="secondary" className="ml-auto text-[10px] px-2 py-0.5 bg-muted/50 border-border/30">Example</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5">
                          {STAFF_CONSOLE_STATS.map((stat, i) => (
                            <div key={i} className="px-3 py-3 rounded-xl bg-muted/30 border border-border/20 text-center">
                              <p className="text-[10px] text-muted-foreground/80 mb-1 uppercase tracking-wide">{stat.label}</p>
                              <p className="text-sm font-bold text-foreground">{stat.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            </div>
          </div>
          
          {/* Ocean line divider motif */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
        </section>

        {/* PLANS SECTION - Conversion-grade tiles */}
        <section id="plans" className="py-20 md:py-28 relative">
          {/* Subtle background */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/20 to-transparent pointer-events-none" />
          
          <div className="container relative mx-auto px-6 max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16 motion-reduce:transform-none"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">Choose your plan</h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                Scale seamlessly as your resort grows. All plans include unlimited staff.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-5 items-stretch">
              {PLANS.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative group flex motion-reduce:transform-none"
                >
                  {/* Most Popular floating badge */}
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                      <Badge className="bg-primary text-primary-foreground px-5 py-1.5 text-xs font-semibold shadow-lg shadow-primary/25 border-0 rounded-full">
                        <Sparkles className="h-3 w-3 mr-1.5" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  {/* Animated gradient border for popular plan */}
                  {plan.popular && (
                    <div className="absolute -inset-[2px] rounded-[20px] bg-gradient-to-r from-primary/40 via-teal-400/40 to-primary/40 opacity-100 animate-[shimmer_4s_ease-in-out_infinite] motion-reduce:animate-none" style={{ backgroundSize: '200% 100%' }} />
                  )}

                  <Card className={`relative flex-1 flex flex-col overflow-hidden transition-all duration-300 motion-reduce:transition-none ${
                    plan.popular 
                      ? 'border-0 shadow-2xl shadow-primary/10 bg-card' 
                      : 'border-border/40 hover:border-border/60 hover:shadow-xl'
                  } hover:-translate-y-1 motion-reduce:hover:translate-y-0`}>
                    
                    {/* Header gradient strip for popular plan */}
                    {plan.popular && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-teal-400 to-primary" />
                    )}

                    <CardHeader className="p-6 pb-0 md:p-8 md:pb-0">
                      {/* Plan name & tagline */}
                      <div className="mb-6">
                        <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{plan.tagline}</p>
                      </div>

                      {/* Price Block */}
                      <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                          <span className="text-5xl md:text-[3.5rem] font-bold text-foreground tracking-tight">{plan.price}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1.5">{plan.unit}</p>
                      </div>

                      {/* Recommended for */}
                      <div className="flex items-center gap-2.5 mb-5 px-4 py-2.5 rounded-xl bg-muted/30 border border-border/20">
                        <Shield className="h-4 w-4 text-primary/80 shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground/90">Recommended for:</span> {plan.recommendedFor}
                        </span>
                      </div>
                    </CardHeader>

                    <Separator className="mx-6 md:mx-8" />

                    <CardContent className="p-6 pt-5 md:p-8 md:pt-5 flex-1 flex flex-col">
                      {/* Features */}
                      <div className="flex-1">
                        {plan.includesLine && (
                          <p className="text-xs font-semibold text-primary mb-4 uppercase tracking-wider">{plan.includesLine}</p>
                        )}
                        <ul className="space-y-3.5 mb-6">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="h-3 w-3 text-primary" />
                              </div>
                              <span className="leading-relaxed">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Why teams choose this - Professional only */}
                        {plan.whyChoose && (
                          <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
                            <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wide">Why teams choose this</p>
                            <ul className="space-y-2">
                              {plan.whyChoose.map((item, i) => (
                                <li key={i} className="flex items-center gap-2.5 text-sm text-foreground">
                                  <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Usage info - Inset panel */}
                      <div className="bg-muted/40 rounded-xl p-4 border border-border/20">
                        <p className="text-sm text-foreground font-medium">{plan.usage}</p>
                        <p className="text-xs text-muted-foreground mt-1">{plan.overage}</p>
                      </div>
                    </CardContent>

                    <CardFooter className="p-6 pt-0 md:p-8 md:pt-0">
                      {/* CTA - Sticky footer */}
                      <Button 
                        asChild 
                        variant={plan.ctaVariant} 
                        size="lg"
                        className={`w-full rounded-xl h-13 font-semibold transition-all duration-300 motion-reduce:transition-none ${
                          plan.popular 
                            ? 'shadow-md hover:shadow-lg hover:shadow-primary/25' 
                            : 'hover:bg-muted/80'
                        }`}
                      >
                        <Link to={plan.id === 'enterprise' ? 'mailto:hello@propera.cc' : '/auth'}>
                          {plan.cta}
                          {plan.popular && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* COMPARISON TABLE - At a glance */}
        <section id="comparison" className="py-20 md:py-24">
          <div className="container mx-auto px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12 motion-reduce:transform-none"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 tracking-tight">At a glance</h2>
              <p className="text-muted-foreground">Quick comparison of what's included in each plan.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="motion-reduce:transform-none"
            >
              <Card className="overflow-hidden border-border/40 shadow-lg shadow-muted/20">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/30">
                      <TableHead className="font-semibold text-foreground py-4">Feature</TableHead>
                      <TableHead className="text-center font-semibold text-foreground py-4">Essential</TableHead>
                      <TableHead className="text-center font-semibold text-foreground py-4 bg-primary/5 border-x border-primary/10">Professional</TableHead>
                      <TableHead className="text-center font-semibold text-foreground py-4">Enterprise</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {COMPARISON_FEATURES.map((feature, index) => (
                      <TableRow key={index} className="hover:bg-muted/20 border-b border-border/20 last:border-0">
                        <TableCell className="font-medium text-foreground py-4">{feature.name}</TableCell>
                        <TableCell className="text-center py-4">
                          {feature.essential ? (
                            <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                              <Check className="h-4 w-4 text-success" />
                            </div>
                          ) : (
                            <XIcon className="h-5 w-5 text-muted-foreground/25 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center bg-primary/3 border-x border-primary/5 py-4">
                          {feature.professional ? (
                            <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                              <Check className="h-4 w-4 text-success" />
                            </div>
                          ) : (
                            <XIcon className="h-5 w-5 text-muted-foreground/25 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center py-4">
                          {feature.enterprise ? (
                            <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                              <Check className="h-4 w-4 text-success" />
                            </div>
                          ) : (
                            <XIcon className="h-5 w-5 text-muted-foreground/25 mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              <p className="text-xs text-muted-foreground/80 text-center mt-5">See plan cards above for full details.</p>
            </motion.div>
          </div>
        </section>

        {/* TRUST SECTION - Proof & Safety */}
        <section className="py-20 md:py-28 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-muted/10 via-transparent to-muted/10 pointer-events-none" />
          
          <div className="container relative mx-auto px-6 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-14 motion-reduce:transform-none"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 tracking-tight">Designed for real resort operations</h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              {TRUST_CARDS.map((card, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="motion-reduce:transform-none"
                >
                  <Card className="p-6 md:p-7 h-full border-border/40 bg-card/80 backdrop-blur-sm hover:border-border/60 transition-all duration-300 motion-reduce:transition-none hover:shadow-lg hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 group">
                    <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center mb-5 group-hover:bg-primary/12 transition-colors motion-reduce:transition-none">
                      <card.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2.5 text-lg">{card.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/70 text-center mt-10">Examples shown are illustrative.</p>
          </div>
        </section>

        {/* ADD-ONS SECTION - Premium upgrade tiles */}
        <section className="py-20 md:py-28 bg-muted/15">
          <div className="container mx-auto px-6 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-14 motion-reduce:transform-none"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 tracking-tight">Add-ons</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Extend your Propera setup with premium capabilities.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {ADDONS.map((addon, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="motion-reduce:transform-none"
                >
                  <Card className="p-5 md:p-6 flex items-start gap-4 border-border/40 bg-card/90 backdrop-blur-sm hover:border-primary/25 transition-all duration-300 motion-reduce:transition-none hover:shadow-lg hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 group h-full">
                    <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/12 transition-colors motion-reduce:transition-none">
                      <addon.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="font-semibold text-foreground text-base">{addon.title}</h4>
                        <Badge variant="secondary" className="text-xs bg-primary/8 text-primary border-primary/15 whitespace-nowrap font-medium">
                          {addon.price}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{addon.description}</p>
                      <a href="mailto:hello@propera.cc" className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1 transition-colors">
                        Learn more <ChevronRight className="h-3 w-3" />
                      </a>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ONBOARDING SECTION - White-glove callout */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-6 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="motion-reduce:transform-none"
            >
              <div className="relative">
                {/* Subtle glow effect */}
                <div className="absolute -inset-2 bg-gradient-to-r from-primary/5 via-teal-400/5 to-primary/5 rounded-3xl blur-xl pointer-events-none" />
                
                <Card className="relative overflow-hidden border-border/40 bg-card">
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                  
                  <div className="grid md:grid-cols-2 gap-8 md:gap-10 p-8 md:p-10 lg:p-12">
                    {/* Left: Content */}
                    <div className="flex flex-col justify-center">
                      <div className="inline-flex items-center gap-2 bg-primary/8 text-primary px-4 py-2 rounded-full text-xs font-semibold mb-5 border border-primary/15 w-fit">
                        <Zap className="h-3.5 w-3.5" />
                        White-glove service
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 tracking-tight">Onboarding & Setup</h2>
                      <p className="text-xl font-semibold text-primary mb-4">$2,500 – $7,500 per resort (one-time)</p>
                      <p className="text-muted-foreground leading-relaxed mb-3">
                        Includes resort setup, branding guidance, activity catalog setup, staff training, and a full test run before launch.
                      </p>
                      <p className="text-xs text-muted-foreground/70">Timeline depends on resort complexity.</p>
                    </div>

                    {/* Right: Timeline */}
                    <div className="flex items-center justify-center">
                      <div className="w-full max-w-sm space-y-0">
                        {ONBOARDING_STEPS.map((item, index) => (
                          <div key={index} className="relative flex items-start gap-5 pb-8 last:pb-0">
                            {/* Connector line */}
                            {index < ONBOARDING_STEPS.length - 1 && (
                              <div className="absolute left-5 top-12 w-px h-[calc(100%-2rem)] bg-gradient-to-b from-primary/30 to-border/30" />
                            )}
                            
                            <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/40 flex items-center justify-center shrink-0 relative z-10">
                              <span className="text-sm font-bold text-primary">{item.step}</span>
                            </div>
                            <div className="pt-1.5">
                              <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="py-20 md:py-28 bg-muted/15">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12 motion-reduce:transform-none"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 tracking-tight">Frequently asked questions</h2>
            </motion.div>

            <Accordion type="single" collapsible className="space-y-3">
              {FAQS.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="motion-reduce:transform-none"
                >
                  <AccordionItem 
                    value={`faq-${index}`}
                    className="bg-card rounded-xl border border-border/40 px-6 overflow-hidden transition-all duration-200 motion-reduce:transition-none hover:border-primary/25 data-[state=open]:border-primary/30 data-[state=open]:shadow-lg data-[state=open]:shadow-primary/5"
                  >
                    <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5 text-base">
                      <span className="pr-4">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>

            {/* Still unsure helper */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 motion-reduce:transform-none"
            >
              <Card className="p-8 text-center border-border/40 bg-card/80 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-lg">Not sure which plan fits?</h3>
                <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
                  Tell us your resort size and departments — we'll recommend the best fit.
                </p>
                <Button asChild size="default" className="rounded-xl px-6">
                  <Link to="/auth">
                    Book a demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* FINAL CTA SECTION - Premium gradient frame */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="motion-reduce:transform-none"
            >
              <div className="relative">
                {/* Gradient border glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-teal-400/15 to-primary/20 rounded-3xl blur-xl opacity-80" />
                <div className="absolute -inset-px bg-gradient-to-r from-primary/30 via-teal-400/20 to-primary/30 rounded-[22px]" />
                
                <Card className="relative p-8 md:p-12 border-0 bg-card overflow-hidden rounded-[20px]">
                  {/* Mesh gradient background */}
                  <div className="absolute top-0 right-0 w-72 h-72 bg-primary/8 rounded-full blur-[100px] pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-56 h-56 bg-teal-400/8 rounded-full blur-[80px] pointer-events-none" />
                  
                  <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
                    {/* Left: Content */}
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 tracking-tight">
                        Ready to see Propera in action?
                      </h2>
                      <p className="text-muted-foreground leading-relaxed text-base">
                        We'll walk through a real guest booking flow + staff operations in under 15 minutes.
                      </p>
                    </div>

                    {/* Right: Buttons */}
                    <div className="flex flex-col gap-5 md:items-end">
                      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <Button asChild size="lg" className="text-base px-8 h-13 rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 motion-reduce:transition-none group">
                          <Link to="/auth">
                            Book a demo
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform motion-reduce:transform-none" />
                          </Link>
                        </Button>
                        <Button variant="outline" size="lg" className="text-base px-8 h-13 rounded-xl border-border/60 hover:bg-muted/50 transition-all duration-300 motion-reduce:transition-none" asChild>
                          <a href="mailto:hello@propera.cc">
                            <MessageCircle className="mr-2 h-5 w-5" />
                            Contact sales
                          </a>
                        </Button>
                      </div>
                      {/* Micro reassurance */}
                      <p className="text-xs text-muted-foreground/80 text-center md:text-right">
                        Unlimited staff included • Multi-resort ready • Email-first notifications
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer - matching landing page */}
      <footer className="py-14 bg-card border-t border-border/40">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link to="/" className="flex items-center gap-3 mb-4">
                <ProperaMark size={36} className="text-primary" />
                <span className="font-bold text-foreground">Propera</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The operating system for world-class resort stays.
              </p>
            </div>
            
            {/* Product */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/#product-tour" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link to="/guest/login" className="hover:text-foreground transition-colors">Guest Portal</Link></li>
              </ul>
            </div>
            
            {/* Company */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><a href="mailto:hello@propera.cc" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            
            {/* Get Started */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Get Started</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/auth" className="hover:text-foreground transition-colors">Sign In</Link></li>
                <li><Link to="/guest/find" className="hover:text-foreground transition-colors">Find Your Resort</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
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
