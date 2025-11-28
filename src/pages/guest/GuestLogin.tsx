import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, User, Building2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { IconPropera, WaveDivider } from '@/components/icons/ProperaIcons';

export default function GuestLogin() {
  const navigate = useNavigate();
  const { guest, login } = useGuestAuth();
  const [loading, setLoading] = useState(false);
  const [loadingResorts, setLoadingResorts] = useState(true);
  const [resorts, setResorts] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ resortId: '', roomNumber: '', lastName: '', pin: '' });

  useEffect(() => {
    if (guest) navigate('/guest');
  }, [guest, navigate]);

  useEffect(() => {
    supabase.from('resorts').select('id, name').order('name').then(({ data }) => {
      if (data) {
        setResorts(data);
        if (data.length === 1) setFormData(f => ({ ...f, resortId: data[0].id }));
      }
      setLoadingResorts(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(formData.resortId, formData.roomNumber, formData.lastName, formData.pin);
    if (result.error) setError(result.error);
    else navigate('/guest');
    setLoading(false);
  };

  if (loadingResorts) {
    return (
      <div className="min-h-screen flex items-center justify-center hero-pattern">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse-soft">
            <IconPropera className="h-8 w-8 text-primary" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

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
            <IconPropera className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Guest Portal</h1>
          <p className="text-muted-foreground">Access your resort experience</p>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <WaveDivider variant="bold" />
        </div>
      </div>

      {/* Login form overlapping wave */}
      <div className="flex-1 flex items-start justify-center px-4 -mt-20 relative z-10">
        <div className="w-full max-w-md">
          <Card className="shadow-elevated border-border/40">
            <CardHeader className="pb-4 pt-8">
              <CardTitle className="text-xl font-bold">Sign In</CardTitle>
              <CardDescription>Use your room number and last name to access your bookings.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {resorts.length > 1 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Resort
                    </Label>
                    <Select value={formData.resortId} onValueChange={(v) => setFormData({ ...formData, resortId: v })}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Select your resort" />
                      </SelectTrigger>
                      <SelectContent>
                        {resorts.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Room Number</Label>
                    <Input 
                      placeholder="e.g., 101" 
                      value={formData.roomNumber} 
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })} 
                      className="h-12 rounded-xl font-mono text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Last Name
                    </Label>
                    <Input 
                      placeholder="Smith" 
                      value={formData.lastName} 
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} 
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    PIN Code
                  </Label>
                  <Input 
                    type="password" 
                    inputMode="numeric" 
                    maxLength={6} 
                    placeholder="Enter PIN" 
                    value={formData.pin} 
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })} 
                    className="h-12 rounded-xl text-center tracking-[0.5em] font-mono text-lg"
                  />
                </div>
                
                {error && (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full h-14 text-base font-bold rounded-xl shadow-md hover-glow" 
                  disabled={loading || !formData.resortId}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <p className="text-center text-sm text-muted-foreground mt-8 pb-8">
            Need help? Please contact your front desk
          </p>
        </div>
      </div>
    </div>
  );
}
