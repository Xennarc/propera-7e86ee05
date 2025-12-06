import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Loader2, 
  RefreshCw, 
  Copy, 
  Check, 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle,
  Target,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AIInsightsPanelProps {
  reportType: string;
  reportData: Record<string, any>;
  resortName?: string;
  dateRange?: { start: string; end: string };
}

interface ParsedInsight {
  type: 'observation' | 'recommendation' | 'warning' | 'opportunity';
  title: string;
  content: string;
}

export function AIInsightsPanel({ reportType, reportData, resortName, dateRange }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasGenerated, setHasGenerated] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [insights, isStreaming]);

  const generateInsights = async () => {
    setIsLoading(true);
    setIsStreaming(true);
    setInsights('');
    setHasGenerated(true);
    
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-insights`;
      
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          reportType,
          reportData,
          resortName,
          dateRange,
          stream: true,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error('Rate limit exceeded. Please try again in a moment.');
          return;
        }
        if (resp.status === 402) {
          toast.error('AI credits exhausted. Please add funds to continue.');
          return;
        }
        throw new Error('Failed to generate insights');
      }

      // Check if streaming response
      const contentType = resp.headers.get('content-type');
      if (contentType?.includes('text/event-stream') && resp.body) {
        // Handle streaming response
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = '';
        let streamDone = false;
        let fullContent = '';

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') {
              streamDone = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                fullContent += content;
                setInsights(fullContent);
              }
            } catch {
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }

        // Final flush
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split('\n')) {
            if (!raw) continue;
            if (raw.endsWith('\r')) raw = raw.slice(0, -1);
            if (raw.startsWith(':') || raw.trim() === '') continue;
            if (!raw.startsWith('data: ')) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                fullContent += content;
                setInsights(fullContent);
              }
            } catch { /* ignore */ }
          }
        }
      } else {
        // Handle non-streaming response
        const data = await resp.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setInsights(data.insights || 'No insights generated.');
      }
    } catch (error: any) {
      console.error('Error generating insights:', error);
      toast.error('Failed to generate AI insights. Please try again.');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const copyInsights = async () => {
    if (!insights) return;
    await navigator.clipboard.writeText(insights);
    setCopied(true);
    toast.success('Insights copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse insights into structured sections
  const parseInsights = (text: string): ParsedInsight[] => {
    const sections: ParsedInsight[] = [];
    const lines = text.split('\n');
    let currentSection: ParsedInsight | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check for section headers
      if (trimmed.match(/^(\*\*)?[\d]+\.\s/i) || trimmed.match(/^[-•]\s*\*\*/)) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          sections.push(currentSection);
        }
        
        // Determine type based on content
        let type: ParsedInsight['type'] = 'observation';
        const lowerLine = trimmed.toLowerCase();
        if (lowerLine.includes('recommend') || lowerLine.includes('action') || lowerLine.includes('suggest')) {
          type = 'recommendation';
        } else if (lowerLine.includes('warning') || lowerLine.includes('concern') || lowerLine.includes('risk')) {
          type = 'warning';
        } else if (lowerLine.includes('opportunity') || lowerLine.includes('potential') || lowerLine.includes('growth')) {
          type = 'opportunity';
        }
        
        currentSection = {
          type,
          title: trimmed.replace(/^[-•\*\d]+[\.\s]*/g, '').replace(/\*\*/g, '').trim(),
          content: '',
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(trimmed);
      } else if (trimmed) {
        // First content before any numbered section
        currentContent.push(trimmed);
      }
    }
    
    // Save last section
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      sections.push(currentSection);
    }
    
    return sections;
  };

  const getInsightIcon = (type: ParsedInsight['type']) => {
    switch (type) {
      case 'recommendation':
        return <Target className="h-4 w-4 text-primary" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'opportunity':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      default:
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const getInsightBadge = (type: ParsedInsight['type']) => {
    switch (type) {
      case 'recommendation':
        return <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">Action</Badge>;
      case 'warning':
        return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">Alert</Badge>;
      case 'opportunity':
        return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30">Opportunity</Badge>;
      default:
        return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30">Insight</Badge>;
    }
  };

  const parsedInsights = insights ? parseInsights(insights) : [];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              AI Revenue Coach
              {isStreaming && (
                <Badge variant="secondary" className="animate-pulse">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Analyzing...
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Data-driven insights and actionable recommendations
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {insights && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyInsights}
                  className="h-8 w-8"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-8 w-8"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </>
            )}
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
              ) : hasGenerated ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {insights ? (
            <div 
              ref={contentRef}
              className={cn(
                "space-y-3 transition-all",
                isStreaming && "max-h-[400px] overflow-y-auto"
              )}
            >
              {/* Show structured insights if we have them */}
              {parsedInsights.length > 0 ? (
                <div className="grid gap-3">
                  {parsedInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-4 rounded-lg border transition-all animate-fade-in",
                        insight.type === 'warning' && "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
                        insight.type === 'opportunity' && "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20",
                        insight.type === 'recommendation' && "border-primary/20 bg-primary/5",
                        insight.type === 'observation' && "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20"
                      )}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getInsightIcon(insight.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getInsightBadge(insight.type)}
                          </div>
                          <p className="font-medium text-sm text-foreground">
                            {insight.title}
                          </p>
                          {insight.content && (
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                              {insight.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Fallback to raw text display during streaming or if parsing fails
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed p-4 bg-muted/30 rounded-lg border">
                    {insights}
                    {isStreaming && (
                      <span className="inline-block w-2 h-4 bg-primary/70 ml-1 animate-pulse" />
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Click "Generate Insights" to get AI-powered analysis
              </p>
              <p className="text-xs text-muted-foreground/70">
                Based on your {reportType} data for {resortName}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
