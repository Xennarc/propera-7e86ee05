import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useVendorPortal } from '@/hooks/useVendorPortal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Building2, Mail, KeyRound, ArrowRight } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export default function VendorLogin() {
  const { session, isValidating, requestCode, verifyCode, isRequestingCode, isVerifyingCode } = useVendorPortal();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [codeSent, setCodeSent] = useState(false);

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/vendor/bookings" replace />;
  }

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestCode(email);
      setStep('code');
      setCodeSent(true);
    } catch {
      // Error handled in hook
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyCode({ email, code });
    } catch {
      // Error handled in hook
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Vendor Portal</CardTitle>
          <CardDescription>
            {step === 'email'
              ? 'Enter your email to receive a login code'
              : 'Enter the 6-digit code sent to your email'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="vendor@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isRequestingCode || !email}>
                {isRequestingCode ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Send Login Code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label>Verification code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={setCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {codeSent && (
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    Code sent to {email}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isVerifyingCode || code.length !== 6}>
                {isVerifyingCode ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <KeyRound className="mr-2 h-4 w-4" />
                )}
                Verify & Login
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep('email');
                  setCode('');
                }}
              >
                Use different email
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
