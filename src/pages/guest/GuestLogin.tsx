import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Hotel } from 'lucide-react';

interface Resort {
  id: string;
  name: string;
}

export default function GuestLogin() {
  const navigate = useNavigate();
  const { guest, login } = useGuestAuth();
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [resortId, setResortId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [lastName, setLastName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingResorts, setLoadingResorts] = useState(true);

  useEffect(() => {
    if (guest) {
      navigate('/guest');
    }
  }, [guest, navigate]);

  useEffect(() => {
    async function fetchResorts() {
      const { data, error } = await supabase
        .from('resorts')
        .select('id, name')
        .order('name');
      
      if (!error && data) {
        setResorts(data);
        if (data.length === 1) {
          setResortId(data[0].id);
        }
      }
      setLoadingResorts(false);
    }
    fetchResorts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(resortId, roomNumber, lastName, pin);
    
    if (result.error) {
      setError(result.error);
    } else {
      navigate('/guest');
    }
    
    setLoading(false);
  };

  if (loadingResorts) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Hotel className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>
            Sign in to access your guest portal and manage your bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {resorts.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="resort">Resort</Label>
                <Select value={resortId} onValueChange={setResortId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your resort" />
                  </SelectTrigger>
                  <SelectContent>
                    {resorts.map((resort) => (
                      <SelectItem key={resort.id} value={resort.id}>
                        {resort.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="roomNumber">Room Number</Label>
              <Input
                id="roomNumber"
                type="text"
                placeholder="e.g. 101"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Enter your last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="4-6 digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                autoComplete="off"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !resortId}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Your PIN was provided at check-in. Contact front desk if you need assistance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
