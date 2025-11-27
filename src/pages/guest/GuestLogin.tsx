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
import { Waves, Loader2, Lock, User, Building2 } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
            <Waves className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Guest Portal</h1>
          <p className="text-muted-foreground mt-1">Access your resort experience</p>
        </div>

        <Card className="shadow-elevated border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Welcome Back</CardTitle>
            <CardDescription>Enter your details to access your bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {resorts.length > 1 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />Resort</Label>
                  <Select value={formData.resortId} onValueChange={(v) => setFormData({ ...formData, resortId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select your resort" /></SelectTrigger>
                    <SelectContent>
                      {resorts.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Room Number</Label>
                  <Input placeholder="e.g., 101" value={formData.roomNumber} onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />Last Name</Label>
                  <Input placeholder="Smith" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Lock className="h-4 w-4 text-muted-foreground" />PIN Code</Label>
                <Input type="password" inputMode="numeric" maxLength={6} placeholder="Enter PIN" value={formData.pin} onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })} className="text-center tracking-widest font-mono" />
              </div>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading || !formData.resortId}>
                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Signing in...</> : 'Access Portal'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">Need help? Please contact your front desk</p>
      </div>
    </div>
  );
}
