import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, ArrowLeft, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { IconPropera, WaveDivider } from '@/components/icons/ProperaIcons';

type SearchResult = 
  | { type: 'found'; resortCode: string; resortName: string }
  | { type: 'multiple' }
  | { type: 'not_found' };

export default function GuestFindResort() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [formData, setFormData] = useState({ lastName: '', roomNumber: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setLoading(true);

    try {
      // Search for guests matching the criteria across all resorts
      const { data: guests, error } = await supabase
        .from('guests')
        .select(`
          id,
          resort_id,
          resorts!inner(id, code, name, status)
        `)
        .ilike('full_name', `%${formData.lastName}%`)
        .ilike('room_number', formData.roomNumber)
        .lte('check_in_date', new Date().toISOString().split('T')[0])
        .gte('check_out_date', new Date().toISOString().split('T')[0]);

      if (error) throw error;

      // Filter to only active resorts
      const activeGuests = guests?.filter((g: any) => g.resorts?.status === 'ACTIVE') || [];

      // Get unique resort IDs
      const uniqueResorts = new Map<string, { code: string; name: string }>();
      activeGuests.forEach((g: any) => {
        if (g.resorts && !uniqueResorts.has(g.resort_id)) {
          uniqueResorts.set(g.resort_id, { code: g.resorts.code, name: g.resorts.name });
        }
      });

      if (uniqueResorts.size === 0) {
        setResult({ type: 'not_found' });
      } else if (uniqueResorts.size === 1) {
        const [_, resort] = Array.from(uniqueResorts.entries())[0];
        setResult({ type: 'found', resortCode: resort.code, resortName: resort.name });
      } else {
        setResult({ type: 'multiple' });
      }
    } catch (error) {
      console.error('Search error:', error);
      setResult({ type: 'not_found' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoToResort = () => {
    if (result?.type === 'found') {
      navigate(`/resort/${result.resortCode}/guest/login`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Theme toggle in top right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle className="text-muted-foreground hover:text-foreground" />
      </div>

      {/* Hero section with wave */}
      <div className="relative pt-16 pb-32 hero-pattern overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-10 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/20 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="text-center relative z-10">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-primary/10 mb-6 shadow-soft">
            <Search className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Find Your Resort</h1>
          <p className="text-muted-foreground">We'll help you locate your guest portal</p>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <WaveDivider variant="bold" />
        </div>
      </div>

      {/* Content overlapping wave */}
      <div className="flex-1 flex items-start justify-center px-4 -mt-20 relative z-10">
        <div className="w-full max-w-md">
          <Card className="shadow-elevated border-border/40">
            <CardHeader className="pb-4 pt-8">
              <CardTitle className="text-xl font-bold">Enter Your Details</CardTitle>
              <CardDescription>
                Provide your last name and room number so we can find your resort.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!result ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Last Name</Label>
                    <Input 
                      placeholder="e.g., Smith" 
                      value={formData.lastName} 
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} 
                      className="h-12 rounded-xl"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Room Number</Label>
                    <Input 
                      placeholder="e.g., 101" 
                      value={formData.roomNumber} 
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })} 
                      className="h-12 rounded-xl font-mono"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-base font-bold rounded-xl shadow-md" 
                    disabled={loading || !formData.lastName || !formData.roomNumber}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-5 w-5" />
                        Find My Resort
                      </>
                    )}
                  </Button>
                </form>
              ) : result.type === 'found' ? (
                <div className="text-center space-y-6">
                  <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Found Your Resort!</h3>
                    <p className="text-muted-foreground">{result.resortName}</p>
                  </div>
                  <Button 
                    onClick={handleGoToResort}
                    className="w-full h-14 text-base font-bold rounded-xl"
                  >
                    Go to Guest Portal
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setResult(null)}
                    className="text-muted-foreground"
                  >
                    Search Again
                  </Button>
                </div>
              ) : result.type === 'multiple' ? (
                <div className="text-center space-y-6">
                  <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
                    <Users className="h-8 w-8 text-warning" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-2">Multiple Matches Found</h3>
                    <p className="text-muted-foreground text-sm">
                      We found more than one possible match for your details. This can happen if you've stayed at multiple resorts or there are similar records.
                    </p>
                  </div>
                  <Alert className="text-left">
                    <AlertDescription>
                      Please contact your resort's front desk or use the QR code/link they provided to access your guest portal directly.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    variant="outline" 
                    onClick={() => setResult(null)}
                    className="w-full"
                  >
                    Try Different Details
                  </Button>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-2">No Match Found</h3>
                    <p className="text-muted-foreground text-sm">
                      We couldn't find a guest with those details. Please check your information and try again, or contact your resort's front desk for assistance.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setResult(null)}
                    className="w-full"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-center mt-6 pb-8">
            <Link to="/guest/login">
              <Button variant="ghost" className="text-muted-foreground gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}