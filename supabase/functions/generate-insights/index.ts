import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportType, reportData, resortName, dateRange } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create system prompt based on report type
    const systemPrompts: Record<string, string> = {
      activities: "You are an analytics assistant for a Maldivian resort activity management system. Analyze activity booking metrics and provide 3-5 practical, actionable recommendations to improve occupancy, revenue, and guest satisfaction. Focus on scheduling optimization, marketing opportunities, and operational efficiency.",
      restaurants: "You are an analytics assistant for a Maldivian resort restaurant management system. Analyze dining reservation metrics and provide 3-5 practical recommendations to optimize covers, reduce no-shows, and improve guest dining experience. Focus on capacity management, meal period optimization, and service quality.",
      cancellations: "You are an analytics assistant for a Maldivian resort operations system. Analyze cancellation patterns across activities and restaurants. Provide 3-5 actionable recommendations to reduce cancellations, improve booking policies, and minimize last-minute disruptions.",
      guests: "You are an analytics assistant for a Maldivian resort guest management system. Analyze guest demographics, channels, and stay patterns. Provide 3-5 strategic recommendations for marketing focus, channel optimization, and guest experience improvements.",
      feedback: "You are an analytics assistant for a Maldivian resort guest satisfaction system. Analyze feedback ratings and sentiment. Provide 3-5 concrete recommendations to address areas of concern and leverage strengths.",
      market: "You are an analytics assistant for a Maldivian resort market segmentation system. Analyze nationality and market mix. Provide 3-5 strategic recommendations for market targeting and cultural experience optimization.",
      "guest-behaviour": "You are an analytics assistant for a Maldivian resort guest engagement system. Analyze activity participation patterns. Provide 3-5 recommendations to boost guest engagement and diversify activity participation.",
      sales: "You are a revenue management and operations consultant for a luxury Maldivian resort. Analyze revenue KPIs, attach rates, channel performance, and cancellation patterns. Provide: (1) 3-5 key observations about current performance with specific numbers, and (2) 5-7 PRACTICAL, CONCRETE actions the resort could test to improve sales next month. Focus on pricing strategies, package creation, upselling tactics, scheduling optimization, targeting high-value segments, and reducing cancellations. Be specific—avoid generic advice. Use the data to support your recommendations.",
    };

    const systemPrompt = systemPrompts[reportType] || "You are an analytics assistant for a resort management system. Provide actionable insights.";

    // Format the data summary
    const dataSummary = `
Resort: ${resortName || 'Unknown'}
Period: ${dateRange?.start || 'N/A'} to ${dateRange?.end || 'N/A'}
Report Type: ${reportType}

Key Metrics:
${JSON.stringify(reportData, null, 2)}

Please analyze this data and provide:
1. 2-3 key observations (trends, anomalies, notable patterns)
2. 3-5 specific, actionable recommendations

Be concise, professional, and focus on practical actions the resort can take immediately.
    `.trim();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: dataSummary },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const insights = data.choices?.[0]?.message?.content || "No insights generated.";

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating insights:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate insights" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});