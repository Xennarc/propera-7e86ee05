import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead, createResortSchema, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProperaLogo } from '@/components/icons/ProperaLogo';
import { 
  Waves, 
  Utensils, 
  Sparkles, 
  MapPin, 
  ArrowRight, 
  Ship, 
  TreePalm,
  Users,
  Calendar,
  Smartphone
} from 'lucide-react';

export default function ResortMarketingPage() {
  const { code } = useParams<{ code: string }>();

  const { data: resort, isLoading, error } = useQuery({
    queryKey: ['resort-marketing', code],
    queryFn: async () => {
      if (!code) throw new Error('Resort code required');
      
      // Use secure RPC function to prevent exposing sensitive business data
      const { data, error } = await supabase.rpc('get_resort_public_info', { p_resort_code: code });

      if (error) throw error;
      
      // Cast the RPC response and filter for active resorts
      const resortData = data as unknown as { 
        id: string; 
        name: string; 
        code: string; 
        status: string;
        timezone: string;
        login_logo_url: string | null;
        login_hero_image_url: string | null;
        login_primary_color: string | null;
        login_accent_color: string | null;
        guest_login_title: string | null;
        guest_login_subtitle: string | null;
        guest_login_instructions: string | null;
        brand_theme: string | null;
        brand_wordmark: string | null;
      } | null;
      
      // Only return if resort is active
      if (!resortData || resortData.status !== 'ACTIVE') {
        return null;
      }
      
      return resortData;
    },
    enabled: !!code,
  });

  if (isLoading) {
    return <ResortMarketingPageSkeleton />;
  }

  if (error || !resort) {
    return <ResortNotFound />;
  }

  const pageTitle = `${resort.name} – Luxury Resort`;
  const pageDescription = `Stay at ${resort.name}. Explore activities, diving excursions, spa experiences, and fine dining with real-time bookings powered by Propera.`;
  const canonicalUrl = `/resorts/${resort.code.toLowerCase()}`;
  const heroImage = resort.login_hero_image_url || 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1200';
  const logoImage = resort.login_logo_url;

  // Structured data for the resort
  const resortSchema = createResortSchema({
    name: resort.name,
    description: pageDescription,
    code: resort.code,
    logoUrl: logoImage,
  });

  // Additional structured data for BreadcrumbList
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Propera',
        item: 'https://propera.cc',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Resorts',
        item: 'https://propera.cc/resorts',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: resort.name,
        item: `https://propera.cc/resorts/${resort.code.toLowerCase()}`,
      },
    ],
  };

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        canonicalUrl={canonicalUrl}
        ogImage={heroImage}
        ogType="website"
        keywords={`${resort.name}, luxury resort, island resort, guest portal, activity booking, restaurant reservation`}
        structuredData={[resortSchema, breadcrumbSchema, PROPERA_ORGANIZATION_SCHEMA]}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <ProperaLogo className="h-8 w-8" />
              <span className="font-semibold text-lg text-foreground">Propera</span>
            </Link>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button asChild size="sm">
                <Link to={`/resort/${resort.code}/guest/login`}>
                  Guest Portal
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section 
          className="relative pt-16 min-h-[70vh] flex items-center justify-center overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.3), hsl(var(--background) / 0.9)), url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="container mx-auto px-4 py-20 text-center relative z-10">
            {logoImage && (
              <img 
                src={logoImage} 
                alt={`${resort.name} logo`}
                className="h-20 w-auto mx-auto mb-6 object-contain"
              />
            )}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
              {resort.name}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Luxury resort experience, powered by Propera
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link to={`/resort/${resort.code}/guest/login`}>
                  Access Guest Portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#experiences">
                  Explore Experiences
                </a>
              </Button>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </section>

        {/* Overview Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Welcome to {resort.name}
              </h2>
              <p className="text-lg text-muted-foreground">
                Discover a paradise where crystal-clear waters meet pristine white beaches. 
                {resort.name} offers an unforgettable escape with world-class amenities, 
                exceptional dining, and extraordinary experiences.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<TreePalm className="h-8 w-8" />}
                title="Overwater Villas"
                description="Luxurious accommodations suspended over turquoise lagoons with direct ocean access and stunning sunset views."
              />
              <FeatureCard
                icon={<Sparkles className="h-8 w-8" />}
                title="Spa & Wellness"
                description="Rejuvenate your senses with traditional and modern treatments at our world-class spa sanctuary."
              />
              <FeatureCard
                icon={<Ship className="h-8 w-8" />}
                title="Marine Adventures"
                description="Explore vibrant coral reefs, swim with marine life, and discover underwater wonders."
              />
            </div>
          </div>
        </section>

        {/* Experiences Section */}
        <section id="experiences" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Unforgettable Experiences
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From thrilling water sports to serene spa treatments, every moment at {resort.name} is designed to create lasting memories.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <ExperienceCard
                icon={<Waves className="h-6 w-6" />}
                title="Diving & Snorkeling"
                items={['PADI Certified Courses', 'Reef Excursions', 'Night Diving', 'Manta Ray Encounters']}
              />
              <ExperienceCard
                icon={<Ship className="h-6 w-6" />}
                title="Water Sports"
                items={['Jet Skiing', 'Parasailing', 'Kayaking', 'Stand-up Paddleboarding']}
              />
              <ExperienceCard
                icon={<Sparkles className="h-6 w-6" />}
                title="Wellness & Spa"
                items={['Signature Massages', 'Yoga Sessions', 'Beauty Treatments', 'Meditation Classes']}
              />
              <ExperienceCard
                icon={<TreePalm className="h-6 w-6" />}
                title="Island Excursions"
                items={['Sunset Cruises', 'Sandbank Picnics', 'Dolphin Watching', 'Local Island Visits']}
              />
            </div>
          </div>
        </section>

        {/* Dining Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Exceptional Dining
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Embark on a culinary journey across our signature restaurants, each offering 
                  a unique dining experience with breathtaking ocean views and world-class cuisine.
                </p>
                <div className="space-y-4">
                  <DiningFeature
                    title="International Cuisine"
                    description="From fresh seafood to authentic Asian flavors and Mediterranean classics"
                  />
                  <DiningFeature
                    title="Private Dining"
                    description="Intimate beachfront dinners under the stars with personalized menus"
                  />
                  <DiningFeature
                    title="Sunset Bars"
                    description="Handcrafted cocktails and fine wines with panoramic ocean views"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Card className="overflow-hidden">
                  <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Utensils className="h-16 w-16 text-primary/50" />
                  </div>
                </Card>
                <Card className="overflow-hidden mt-8">
                  <div className="aspect-square bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                    <Sparkles className="h-16 w-16 text-accent-foreground/50" />
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Location Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <MapPin className="h-12 w-12 mx-auto text-primary mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Located in Paradise
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              {resort.name} offers easy access with convenient transfer options. Your journey 
              to paradise begins the moment you arrive.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Paradise Location
              </span>
              <span>•</span>
              <span>Easy Transfer Access</span>
              <span>•</span>
              <span>Year-Round Destination</span>
            </div>
          </div>
        </section>

        {/* Propera Integration Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
                <CardContent className="p-8 md:p-12">
                  <div className="flex items-center gap-3 mb-6">
                    <ProperaLogo className="h-10 w-10" />
                    <span className="text-2xl font-semibold text-foreground">Powered by Propera</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                    Seamless Guest Experience
                  </h3>
                  <p className="text-lg text-muted-foreground mb-8">
                    As a guest at {resort.name}, enjoy the convenience of real-time activity and 
                    dining reservations through our digital guest portal. Browse available experiences, 
                    book your favorite activities, and manage your itinerary—all from your smartphone.
                  </p>
                  <div className="grid sm:grid-cols-3 gap-6 mb-8">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary mt-1 shrink-0" />
                      <div>
                        <div className="font-medium text-foreground">Real-Time Booking</div>
                        <div className="text-sm text-muted-foreground">Instant confirmations</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Smartphone className="h-5 w-5 text-primary mt-1 shrink-0" />
                      <div>
                        <div className="font-medium text-foreground">Mobile Friendly</div>
                        <div className="text-sm text-muted-foreground">Book from anywhere</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-primary mt-1 shrink-0" />
                      <div>
                        <div className="font-medium text-foreground">Group Bookings</div>
                        <div className="text-sm text-muted-foreground">For the whole family</div>
                      </div>
                    </div>
                  </div>
                  <Button asChild size="lg" className="gap-2">
                    <Link to={`/resort/${resort.code}/guest/login`}>
                      Access Guest Portal
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Already a Guest?
            </h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
              Log in to your guest portal to view your bookings, explore activities, 
              and make reservations during your stay.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" variant="secondary" className="gap-2">
                <Link to={`/resort/${resort.code}/guest/login`}>
                  Guest Portal Login
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/">
                  Learn About Propera
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 bg-muted/50 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <ProperaLogo className="h-6 w-6" />
                <span className="text-sm text-muted-foreground">
                  © {new Date().getFullYear()} Propera. All rights reserved.
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <Link to="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
                <Link to={`/resort/${resort.code}/guest/login`} className="hover:text-foreground transition-colors">
                  Guest Portal
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

// Sub-components

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="text-center p-6 hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ExperienceCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <Card className="p-6">
      <CardContent className="p-0">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-3">{title}</h3>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DiningFeature({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <Utensils className="h-5 w-5 text-primary mt-1 shrink-0" />
      <div>
        <div className="font-medium text-foreground">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}

function ResortMarketingPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b border-border" />
      <div className="pt-16">
        <div className="h-[70vh] bg-muted/30 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Skeleton className="h-12 w-64 mx-auto" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResortNotFound() {
  return (
    <>
      <SEOHead
        title="Resort Not Found"
        description="The resort you're looking for could not be found or is not currently available."
        noIndex={true}
      />
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <TreePalm className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-4">Resort Not Found</h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            The resort you're looking for could not be found or is not currently available. 
            Please check the URL or return to our homepage.
          </p>
          <Button asChild>
            <Link to="/">Return to Homepage</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
