import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEOHead, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { 
  LogIn, Menu, X, Check, Users, Building2, MessageCircle, ArrowRight, 
  Zap, Globe, RefreshCw, Mail, Plug, BarChart3, Headphones, FileEdit,
  Sparkles, Shield, Smartphone, Clock, ChevronRight, XIcon,
  UtensilsCrossed, Activity, Palette, Eye, LayoutGrid, Lock
} from 'lucide-react';
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
  { icon: Users, text: 'Unlimited staff users' },
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
  { step: 1, title: 'Resort setup' },
  { step: 2, title: 'Catalog + branding' },
  { step: 3, title: 'Training + launch test' },
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
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
          {/* Premium Background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
            {/* Radial glow behind headline */}
            <div className="absolute top-1/3 left-1/4 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-teal-400/8 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-lagoon-400/10 rounded-full blur-[100px] pointer-events-none" />
          </div>

          {/* Ocean line divider motif */}
          <div className="absolute top-[60%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          <div className="container relative mx-auto px-6 max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left: Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 border border-primary/20"
                >
                  <Sparkles className="h-4 w-4" />
                  Simple, transparent pricing
                </motion.div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight">
                  Pricing
                </h1>
                
                <p className="text-lg md:text-xl text-muted-foreground mb-4 leading-relaxed">
                  Built for island resorts. Priced to scale with you.
                </p>
                
                <p className="text-sm text-muted-foreground/70 mb-8">
                  Unlimited staff users included on every plan. No seat-based pricing.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <Button asChild size="lg" className="text-base px-8 h-14 rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 group">
                    <Link to="/auth">
                      Book a demo
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" className="text-base px-8 h-14 rounded-xl hover:bg-primary/5 transition-all duration-300" onClick={scrollToPlans}>
                    Compare plans
                  </Button>
                </div>

                {/* Value Chips */}
                <div className="flex flex-wrap gap-2">
                  {TRUST_ITEMS.map((item, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="px-3 py-1.5 text-xs font-medium bg-muted/50 text-muted-foreground border border-border/50 rounded-full"
                    >
                      <item.icon className="h-3 w-3 mr-1.5 text-primary" />
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
                className="hidden lg:block"
              >
                <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm shadow-elevated">
                  {/* Mac-style window header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-coral-400/60" />
                      <div className="w-3 h-3 rounded-full bg-sunset-400/60" />
                      <div className="w-3 h-3 rounded-full bg-success/60" />
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">Propera Dashboard</span>
                    <Badge variant="secondary" className="ml-auto text-2xs">Example</Badge>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Guest Portal Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Globe className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">Guest Portal</span>
                      </div>
                      <div className="space-y-2">
                        {GUEST_PORTAL_ITEMS.map((item, i) => (
                          <div 
                            key={i} 
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/40 border border-border/30"
                          >
                            <span className="text-sm text-foreground">{item}</span>
                            <Badge variant="secondary" className="text-2xs bg-success/10 text-success border-success/20">Available</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator className="bg-border/50" />

                    {/* Staff Console Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-lagoon-500/10 flex items-center justify-center">
                          <LayoutGrid className="h-3.5 w-3.5 text-lagoon-500" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">Staff Console</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {STAFF_CONSOLE_STATS.map((stat, i) => (
                          <div key={i} className="px-3 py-2.5 rounded-lg bg-muted/40 border border-border/30 text-center">
                            <p className="text-xs text-muted-foreground mb-0.5">{stat.label}</p>
                            <p className="text-sm font-semibold text-foreground">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* PLANS SECTION - Conversion-grade tiles */}
        <section id="plans" className="py-20 md:py-28">
          <div className="container mx-auto px-6 max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Choose your plan</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Scale seamlessly as your resort grows. All plans include unlimited staff.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {PLANS.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative group"
                >
                  {/* Most Popular floating badge */}
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-primary text-primary-foreground px-5 py-1.5 text-xs font-semibold shadow-lg shadow-primary/20 border-0">
                        <Sparkles className="h-3 w-3 mr-1.5" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <Card className={`relative h-full flex flex-col overflow-hidden transition-all duration-300 ${
                    plan.popular 
                      ? 'border-primary/50 ring-2 ring-primary/20 shadow-xl shadow-primary/10 hover:shadow-2xl hover:shadow-primary/15' 
                      : 'border-border/50 hover:border-border hover:shadow-lg'
                  } hover:-translate-y-1 motion-reduce:hover:translate-y-0`}>
                    
                    {/* Animated gradient border for popular plan */}
                    {plan.popular && (
                      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 animate-shimmer" 
                          style={{ transform: 'translateX(-100%)', animationDuration: '3s' }} 
                        />
                      </div>
                    )}
                    
                    {/* Header gradient strip for popular plan */}
                    {plan.popular && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-primary to-lagoon-500" />
                    )}

                    <div className="p-6 md:p-8 flex flex-col h-full">
                      {/* Header */}
                      <div className="mb-5">
                        <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{plan.tagline}</p>
                      </div>

                      {/* Price Block */}
                      <div className="mb-5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">{plan.price}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{plan.unit}</p>
                      </div>

                      {/* Recommended for */}
                      <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-lg bg-muted/40 border border-border/30">
                        <Shield className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Recommended for:</span> {plan.recommendedFor}
                        </span>
                      </div>

                      <Separator className="mb-5" />

                      {/* Features */}
                      <div className="flex-1">
                        {plan.includesLine && (
                          <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wide">{plan.includesLine}</p>
                        )}
                        <ul className="space-y-3 mb-5">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="h-3 w-3 text-primary" />
                              </div>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Why teams choose this - Professional only */}
                        {plan.whyChoose && (
                          <div className="mb-5 p-4 rounded-xl bg-primary/5 border border-primary/10">
                            <p className="text-xs font-semibold text-primary mb-2.5">Why teams choose this</p>
                            <ul className="space-y-1.5">
                              {plan.whyChoose.map((item, i) => (
                                <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                                  <ChevronRight className="h-3 w-3 text-primary" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Usage info - Inset panel */}
                      <div className="bg-muted/40 rounded-xl p-4 mb-6 border border-border/30">
                        <p className="text-sm text-foreground font-medium">{plan.usage}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{plan.overage}</p>
                      </div>

                      {/* CTA - Sticky footer */}
                      <Button 
                        asChild 
                        variant={plan.ctaVariant} 
                        size="lg"
                        className={`w-full rounded-xl h-12 font-semibold transition-all duration-300 ${
                          plan.popular 
                            ? 'shadow-md hover:shadow-lg hover:shadow-primary/20' 
                            : 'hover:bg-primary/5'
                        }`}
                      >
                        <Link to={plan.id === 'enterprise' ? 'mailto:hello@propera.cc' : '/auth'}>
                          {plan.cta}
                          {plan.popular && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Link>
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* COMPARISON TABLE - At a glance */}
        <section className="py-16 md:py-20 bg-muted/20">
          <div className="container mx-auto px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">At a glance</h2>
              <p className="text-muted-foreground text-sm">Quick comparison of what's included in each plan.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="overflow-hidden border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold text-foreground">Feature</TableHead>
                      <TableHead className="text-center font-semibold text-foreground">Essential</TableHead>
                      <TableHead className="text-center font-semibold text-foreground bg-primary/5">Professional</TableHead>
                      <TableHead className="text-center font-semibold text-foreground">Enterprise</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {COMPARISON_FEATURES.map((feature, index) => (
                      <TableRow key={index} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-foreground">{feature.name}</TableCell>
                        <TableCell className="text-center">
                          {feature.essential ? (
                            <Check className="h-5 w-5 text-success mx-auto" />
                          ) : (
                            <XIcon className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center bg-primary/5">
                          {feature.professional ? (
                            <Check className="h-5 w-5 text-success mx-auto" />
                          ) : (
                            <XIcon className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {feature.enterprise ? (
                            <Check className="h-5 w-5 text-success mx-auto" />
                          ) : (
                            <XIcon className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              <p className="text-xs text-muted-foreground text-center mt-4">See plan cards above for full details.</p>
            </motion.div>
          </div>
        </section>

        {/* TRUST SECTION - Proof & Safety */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Designed for real resort operations</h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TRUST_CARDS.map((card, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 h-full border-border/50 hover:border-border transition-all duration-300 hover:shadow-md group">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                      <card.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{card.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-8">Examples shown are illustrative.</p>
          </div>
        </section>

        {/* ADD-ONS SECTION - Premium upgrade tiles */}
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container mx-auto px-6 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Add-ons</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Extend your Propera setup with premium capabilities.
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
                  <Card className="p-5 flex items-start gap-4 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md group">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                      <addon.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-semibold text-foreground">{addon.title}</h4>
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20 whitespace-nowrap">
                          {addon.price}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{addon.description}</p>
                      <a href="mailto:hello@propera.cc" className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1">
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
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/5">
                <div className="grid md:grid-cols-2 gap-8 p-8 md:p-10">
                  {/* Left: Content */}
                  <div>
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium mb-4 border border-primary/20">
                      <Zap className="h-3 w-3" />
                      White-glove service
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Onboarding & Setup</h2>
                    <p className="text-lg font-medium text-primary mb-4">$2,500 – $7,500 per resort (one-time)</p>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      Includes resort setup, branding guidance, activity catalog setup, staff training, and a full test run before launch.
                    </p>
                    <p className="text-xs text-muted-foreground/70">Timeline depends on resort complexity.</p>
                  </div>

                  {/* Right: Timeline */}
                  <div className="flex items-center">
                    <div className="w-full space-y-4">
                      {ONBOARDING_STEPS.map((item, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">{item.step}</span>
                          </div>
                          <div className="flex-1 h-px bg-border/50" />
                          <span className="text-sm font-medium text-foreground whitespace-nowrap">{item.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Frequently asked questions</h2>
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

            {/* Still unsure helper */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-10"
            >
              <Card className="p-6 text-center border-border/50 bg-card">
                <h3 className="font-semibold text-foreground mb-2">Not sure which plan fits?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Tell us your resort size and departments — we'll recommend the best fit.
                </p>
                <Button asChild size="sm" className="rounded-xl">
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
            >
              <div className="relative">
                {/* Gradient border glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-teal-400/20 to-lagoon-400/20 rounded-3xl blur-lg opacity-75" />
                
                <Card className="relative p-8 md:p-12 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden rounded-2xl">
                  {/* Mesh gradient background */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-400/10 rounded-full blur-[80px] pointer-events-none" />
                  
                  <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                    {/* Left: Content */}
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                        Ready to see Propera in action?
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">
                        We'll walk through a real guest booking flow + staff operations in under 15 minutes.
                      </p>
                    </div>

                    {/* Right: Buttons */}
                    <div className="flex flex-col gap-4 md:items-end">
                      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <Button asChild size="lg" className="text-base px-8 h-12 rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 group">
                          <Link to="/auth">
                            Book a demo
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </Button>
                        <Button variant="outline" size="lg" className="text-base px-8 h-12 rounded-xl hover:bg-primary/5 transition-all duration-300" asChild>
                          <a href="mailto:hello@propera.cc">
                            <MessageCircle className="mr-2 h-5 w-5" />
                            Contact sales
                          </a>
                        </Button>
                      </div>
                      {/* Micro reassurance */}
                      <p className="text-xs text-muted-foreground text-center md:text-right">
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
