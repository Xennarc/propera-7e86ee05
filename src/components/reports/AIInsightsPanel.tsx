import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIInsightsPanelProps {
  reportType: string;
  reportData: Record<string, any>;
  resortName?: string;
  dateRange?: { start: string; end: string };
}

export function AIInsightsPanel({ reportType, reportData, resortName, dateRange }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: {
          reportType,
          reportData,
          resortName,
          dateRange,
        },
      });

      if (error) throw error;
      
      setInsights(data.insights);
    } catch (error: any) {
      console.error('Error generating insights:', error);
      toast.error('Failed to generate AI insights. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Insights
            </CardTitle>
            <CardDescription className="mt-1.5">
              Data-driven recommendations and observations
            </CardDescription>
          </div>
          <Button
            onClick={generateInsights}
            disabled={isLoading}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Insights
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {insights && (
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
              {insights}
            </div>
          </div>
        </CardContent>
      )}
      {!insights && !isLoading && (
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Click "Generate Insights" to get AI-powered recommendations based on your current data
          </p>
        </CardContent>
      )}
    </Card>
  );
}