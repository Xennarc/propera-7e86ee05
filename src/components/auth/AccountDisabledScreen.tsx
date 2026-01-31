import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Ban, LogOut, Mail } from 'lucide-react';

export function AccountDisabledScreen() {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Ban className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Account Disabled</CardTitle>
          <CardDescription>
            Your account has been disabled by an administrator. You no longer have access to the staff portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg text-sm text-center text-muted-foreground">
            If you believe this is an error, please contact your system administrator.
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => window.location.href = 'mailto:support@propera.io'}
              className="w-full"
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
            <Button
              variant="ghost"
              onClick={signOut}
              className="w-full text-muted-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
