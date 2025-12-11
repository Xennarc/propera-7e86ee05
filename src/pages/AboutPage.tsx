import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEOHead, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { WaveDivider } from '@/components/icons/ProperaIcons';
import { 
  Sparkles, 
  LogIn, 
  ArrowRight,
  Heart,
  Target,
  Lightbulb,
  Users,
  Globe,
  Zap
} from 'lucide-react';

// ==========================================
// CONFIGURATION
// ==========================================

const TEAM_MEMBERS = [
  {
    name: 'Alex Chen',
    role: 'Co-Founder & CEO',
    bio: 'Former resort operations director with 15 years in luxury hospitality across Asia-Pacific.',
    avatar: null,
  },
  {
    name: 'Sarah Mitchell',
    role: 'Co-Founder & CTO',
    bio: 'Previously led engineering at a leading hospitality tech company. Passionate about simplifying complex operations.',
    avatar: null,
  },
  {
    name: 'James Ranaweera',
    role: 'Head of Product',
    bio: 'Background in guest experience design at five-star island resorts. Obsessed with delightful UX.',
    avatar: null,
  },
  {
    name: 'Maria Santos',
    role: 'Head of Customer Success',
    bio: 'Spent a decade in resort management before joining Propera. Knows exactly what operators need.',
    avatar: null,
  },
];

const VALUES = [
  {
    icon: Heart,
    title: 'Guest-First Thinking',
    description: "Every feature we build starts with one question: will this make the guest experience better?",
  },
  {
    icon: Lightbulb,
    title: 'Simplicity Over Complexity',
    description: "Resort operations are complicated enough. Our software should make things simpler, not harder.",
  },
  {
    icon: Zap,
    title: 'Speed Matters',
    description: "Whether it's loading times, onboarding, or support responses—we respect your time.",
  },
  {
    icon: Users,
    title: 'Built With Operators',
    description: "We don't just build for resorts—we build with them. Your feedback shapes our roadmap.",
  },
];

const ABOUT_PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About Propera - Our Story & Team',
  description: 'Learn about Propera, the team behind the resort booking platform, and our mission to transform guest experiences.',
  url: 'https://propera.cc/about',
};

// ==========================================
// COMPONENT
// ==========================================

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="About Us - Our Story & Team"
        description="Propera was founded by hospitality veterans who understood that resort operations needed a modern, guest-centric solution. Meet the team and learn our story."
        canonicalUrl="/about"
        keywords="about propera, resort technology company, hospitality software team, guest experience platform"
        structuredData={[PROPERA_ORGANIZATION_SCHEMA, ABOUT_PAGE_SCHEMA]}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between" aria-label="Main navigation">
          <Link to="/" className="flex items-center gap-3">
            <ProperaMark size={40} className="text-primary" />
            <span className="text-xl font-bold text-foreground tracking-tight">Propera</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link 
              to="/about" 
              className="hidden sm:inline-flex text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              About
            </Link>
            <Link 
              to="/pricing" 
              className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Pricing
            </Link>
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <Button asChild size="sm" className="rounded-full px-5 font-semibold shadow-md">
              <Link to="/guest/login" aria-label="Access guest login portal">
                <LogIn className="h-4 w-4 mr-2" aria-hidden="true" />
                Guest Login
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden hero-pattern" aria-labelledby="about-hero-heading">
          <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[80px] pointer-events-none" aria-hidden="true" />

          <div className="container relative mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-5 py-2.5 rounded-full text-sm font-semibold mb-8 animate-fade-in shadow-sm border border-primary/20">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                About Us
              </div>

              <h1 id="about-hero-heading" className="text-4xl md:text-5xl lg:text-display font-extrabold text-foreground mb-6 text-balance animate-slide-up">
                Making resort stays{' '}
                <span className="text-gradient">effortlessly delightful</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-balance animate-slide-up leading-relaxed">
                We believe every guest deserves a seamless experience, and every resort team deserves tools that actually work. Propera exists to make that happen.
              </p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0" aria-hidden="true">
            <WaveDivider variant="subtle" />
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-20 md:py-28 bg-card relative" aria-labelledby="mission-heading">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-semibold mb-6">
                    <Target className="h-4 w-4" />
                    Our Mission
                  </div>
                  <h2 id="mission-heading" className="text-3xl md:text-headline font-bold text-foreground mb-6">
                    To give every resort the tools to deliver world-class guest experiences
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Too many resorts still rely on spreadsheets, WhatsApp groups, and handwritten logs to manage bookings. Guests end up confused, staff get overwhelmed, and opportunities slip through the cracks.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    We built Propera to change that. A single, intuitive platform that connects guests, staff, and outlets—so everyone stays in sync, and every stay feels effortless.
                  </p>
                </div>
                <div className="relative">
                  <Card className="card-luxury p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px]" aria-hidden="true" />
                    <div className="relative">
                      <Globe className="h-12 w-12 text-primary mb-6" />
                      <p className="text-2xl font-bold text-foreground mb-2">Trusted by resorts worldwide</p>
                      <p className="text-muted-foreground">From boutique island hideaways to multi-property resort groups, Propera helps teams deliver exceptional guest experiences.</p>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Wave transition */}
        <WaveDivider flip className="text-card" aria-hidden="true" />

        {/* Story Section */}
        <section className="py-20 md:py-28 bg-background section-gradient-warm" aria-labelledby="story-heading">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 id="story-heading" className="text-3xl md:text-headline font-bold text-foreground mb-4">
                  Our Story
                </h2>
              </div>

              <div className="prose prose-lg max-w-none">
                <Card className="card-luxury p-8 md:p-10">
                  <div className="space-y-6 text-muted-foreground leading-relaxed">
                    <p>
                      Propera started with a simple frustration: why is booking a spa treatment at a luxury resort harder than ordering dinner from your phone?
                    </p>
                    <p>
                      Our founders spent years working inside resorts—managing dive centres, overseeing F&B operations, and coordinating guest activities. They saw firsthand how fragmented systems led to double-bookings, missed opportunities, and stressed staff.
                    </p>
                    <p>
                      In 2023, they set out to build the platform they wished they had: one that puts guests in control of their stay, gives staff real-time visibility, and helps management make smarter decisions with data.
                    </p>
                    <p className="text-foreground font-medium">
                      Today, Propera powers guest experiences at resorts around the world—and we are just getting started.
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 md:py-28 bg-card" aria-labelledby="values-heading">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 id="values-heading" className="text-3xl md:text-headline font-bold text-foreground mb-4">
                What We Believe
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                The principles that guide how we build and support Propera.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
              {VALUES.map((value, index) => (
                <ValueCard key={index} value={value} />
              ))}
            </div>
          </div>
        </section>

        {/* Wave transition */}
        <WaveDivider flip className="text-card" aria-hidden="true" />

        {/* Team Section */}
        <section className="py-20 md:py-28 bg-background" aria-labelledby="team-heading">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 id="team-heading" className="text-3xl md:text-headline font-bold text-foreground mb-4">
                Meet the Team
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Hospitality veterans and technologists united by a passion for great guest experiences.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
              {TEAM_MEMBERS.map((member, index) => (
                <TeamMemberCard key={index} member={member} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-28 bg-card relative overflow-hidden" aria-labelledby="about-cta-heading">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[60px] pointer-events-none" aria-hidden="true" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-accent/10 rounded-full blur-[40px] pointer-events-none" aria-hidden="true" />

          <div className="container mx-auto px-4 relative">
            <Card className="max-w-2xl mx-auto border-primary/20 shadow-elevated card-stack overflow-hidden">
              <CardContent className="p-8 md:p-12 text-center relative">
                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8 shadow-sm" aria-hidden="true">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <h2 id="about-cta-heading" className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Ready to transform your resort operations?
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  See how Propera can help your team deliver better guest experiences with less effort.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button asChild size="lg" className="text-base px-8 rounded-full font-semibold shadow-md">
                    <a href="mailto:hello@propera.cc?subject=Demo Request">
                      Request a demo
                      <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="text-base px-8 rounded-full font-semibold">
                    <Link to="/pricing">
                      View pricing
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-10 bg-background border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3">
              <ProperaMark size={36} className="text-primary" />
              <div className="flex flex-col">
                <span className="font-bold text-foreground">Propera</span>
                <span className="text-xs text-muted-foreground">Your resort, perfectly in sync.</span>
              </div>
            </Link>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-primary transition-colors">About</Link>
              <Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
              <span>© {new Date().getFullYear()} Propera. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function ValueCard({ value }: { value: typeof VALUES[0] }) {
  const Icon = value.icon;
  
  return (
    <Card className="card-luxury hover-lift group">
      <CardContent className="p-7">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm" aria-hidden="true">
          <Icon className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">{value.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
      </CardContent>
    </Card>
  );
}

function TeamMemberCard({ member }: { member: typeof TEAM_MEMBERS[0] }) {
  return (
    <Card className="card-luxury text-center">
      <CardContent className="p-6">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">{member.name}</h3>
        <p className="text-sm text-primary font-medium mb-3">{member.role}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{member.bio}</p>
      </CardContent>
    </Card>
  );
}
