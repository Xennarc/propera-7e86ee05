import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function Reports() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground">Operational statistics and analytics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Statistics</CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Reports Coming Soon
            </h3>
            <p className="text-muted-foreground max-w-md">
              Monthly operational statistics, booking trends, and management reports will be available here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
