import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "https://propera.cc",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has required role (SUPER_ADMIN, RESORT_ADMIN, or MANAGER)
    const { data: profile } = await supabase
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .single();

    const isSuperAdmin = profile?.global_role === "SUPER_ADMIN";

    if (!isSuperAdmin) {
      // Check resort membership for RESORT_ADMIN or MANAGER role
      const { data: memberships } = await supabase
        .from("resort_memberships")
        .select("resort_role")
        .eq("user_id", user.id);

      const hasAllowedRole = memberships?.some(
        (m) => ["RESORT_ADMIN", "MANAGER"].includes(m.resort_role)
      );

      if (!hasAllowedRole) {
        return new Response(
          JSON.stringify({ error: "Forbidden: Insufficient permissions" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { reportType, reportData, resortName, dateRange, stream = false } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create enhanced system prompt based on report type
    const systemPrompts: Record<string, string> = {
      activities: `You are a revenue management consultant for a luxury resort analyzing activity bookings.

Your analysis style:
- Be specific with numbers from the data
- Prioritize actionable insights over generic observations
- Focus on revenue optimization and guest experience
- Consider seasonality and operational constraints

Format your response as:
**Key Observations**
1. [Observation with specific data points]
2. [Observation with specific data points]
3. [Observation with specific data points]

**Recommendations**
1. **[Action Title]** - [Specific, implementable recommendation with expected impact]
2. **[Action Title]** - [Specific, implementable recommendation with expected impact]
3. **[Action Title]** - [Specific, implementable recommendation with expected impact]
4. **[Action Title]** - [Specific, implementable recommendation with expected impact]`,

      restaurants: `You are a hospitality revenue consultant for a luxury resort analyzing dining operations.

Your analysis style:
- Be specific with numbers from the data
- Focus on covers optimization, table turnover, and guest satisfaction
- Consider meal period dynamics and no-show patterns
- Recommend practical improvements

Format your response as:
**Key Observations**
1. [Observation with specific data points]
2. [Observation with specific data points]
3. [Observation with specific data points]

**Recommendations**
1. **[Action Title]** - [Specific, implementable recommendation]
2. **[Action Title]** - [Specific, implementable recommendation]
3. **[Action Title]** - [Specific, implementable recommendation]
4. **[Action Title]** - [Specific, implementable recommendation]`,

      cancellations: `You are an operations analyst for a luxury resort analyzing cancellation patterns.

Your analysis style:
- Identify root causes of cancellations
- Quantify revenue impact
- Suggest policy and operational improvements
- Consider guest experience implications

Format your response as:
**Key Observations**
1. [Observation with specific data points]
2. [Observation with specific data points]
3. [Observation with specific data points]

**Recommendations**
1. **[Action Title]** - [Specific, implementable recommendation]
2. **[Action Title]** - [Specific, implementable recommendation]
3. **[Action Title]** - [Specific, implementable recommendation]
4. **[Action Title]** - [Specific, implementable recommendation]`,

      guests: `You are a marketing strategist for a luxury resort analyzing guest demographics.

Your analysis style:
- Identify high-value guest segments
- Analyze channel effectiveness
- Suggest targeting and personalization opportunities
- Consider guest lifecycle and repeat business

Format your response as:
**Key Observations**
1. [Observation with specific data points]
2. [Observation with specific data points]
3. [Observation with specific data points]

**Recommendations**
1. **[Action Title]** - [Specific, implementable recommendation]
2. **[Action Title]** - [Specific, implementable recommendation]
3. **[Action Title]** - [Specific, implementable recommendation]
4. **[Action Title]** - [Specific, implementable recommendation]`,

      feedback: `You are a guest experience consultant for a luxury resort analyzing feedback data.

Your analysis style:
- Identify patterns in ratings and comments
- Prioritize issues by impact and frequency
- Suggest concrete service improvements
- Highlight strengths to maintain

Format your response as:
**Key Observations**
1. [Observation with specific data points]
2. [Observation with specific data points]
3. [Observation with specific data points]

**Recommendations**
1. **[Action Title]** - [Specific, implementable recommendation]
2. **[Action Title]** - [Specific, implementable recommendation]
3. **[Action Title]** - [Specific, implementable recommendation]
4. **[Action Title]** - [Specific, implementable recommendation]`,

      market: `You are a market analyst for a luxury resort analyzing guest nationality mix.

Your analysis style:
- Identify high-spending nationalities
- Analyze market trends and opportunities
- Suggest targeted marketing approaches
- Consider cultural preferences and seasonality

Format your response as:
**Key Observations**
1. [Observation with specific data points]
2. [Observation with specific data points]
3. [Observation with specific data points]

**Recommendations**
1. **[Action Title]** - [Specific, implementable recommendation]
2. **[Action Title]** - [Specific, implementable recommendation]
3. **[Action Title]** - [Specific, implementable recommendation]
4. **[Action Title]** - [Specific, implementable recommendation]`,

      "guest-behaviour": `You are a guest engagement specialist for a luxury resort analyzing participation patterns.

Your analysis style:
- Identify engagement gaps and opportunities
- Analyze activity participation trends
- Suggest ways to increase guest involvement
- Consider cross-selling and bundling opportunities

Format your response as:
**Key Observations**
1. [Observation with specific data points]
2. [Observation with specific data points]
3. [Observation with specific data points]

**Recommendations**
1. **[Action Title]** - [Specific, implementable recommendation]
2. **[Action Title]** - [Specific, implementable recommendation]
3. **[Action Title]** - [Specific, implementable recommendation]
4. **[Action Title]** - [Specific, implementable recommendation]`,

      sales: `You are a revenue optimization expert for a luxury resort analyzing sales performance.

Your analysis style:
- Focus on revenue drivers and attach rates
- Analyze booking source effectiveness (pre-arrival vs in-stay vs normal)
- Identify pricing optimization opportunities
- Quantify lost revenue from cancellations
- Suggest concrete experiments to test

Format your response as:
**Key Observations**
1. [Observation with specific data points]
2. [Observation with specific data points]
3. [Observation with specific data points]

**Revenue Opportunities**
1. **[Opportunity Title]** - [Specific recommendation with expected revenue impact]
2. **[Opportunity Title]** - [Specific recommendation with expected revenue impact]

**Action Items**
1. **[Action Title]** - [Concrete, testable action for next month]
2. **[Action Title]** - [Concrete, testable action for next month]
3. **[Action Title]** - [Concrete, testable action for next month]
4. **[Action Title]** - [Concrete, testable action for next month]
5. **[Action Title]** - [Concrete, testable action for next month]`,
    };

    const systemPrompt = systemPrompts[reportType] || `You are an analytics assistant for a luxury resort. Analyze the data and provide actionable insights.

Format your response as:
**Key Observations**
1. [Observation with specific data points]
2. [Observation with specific data points]
3. [Observation with specific data points]

**Recommendations**
1. **[Action Title]** - [Specific, implementable recommendation]
2. **[Action Title]** - [Specific, implementable recommendation]
3. **[Action Title]** - [Specific, implementable recommendation]`;

    // Format the data summary
    const dataSummary = `
Resort: ${resortName || 'Unknown'}
Analysis Period: ${dateRange?.start || 'N/A'} to ${dateRange?.end || 'N/A'}
Report Type: ${reportType}

Data Summary:
${JSON.stringify(reportData, null, 2)}

Analyze this data and provide your insights. Be specific, use the actual numbers, and make recommendations that are practical and testable.
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
        stream: stream,
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

    // Handle streaming vs non-streaming response
    if (stream) {
      // Return the stream directly
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      // Parse and return JSON response
      const data = await response.json();
      const insights = data.choices?.[0]?.message?.content || "No insights generated.";

      return new Response(
        JSON.stringify({ insights }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("Error generating insights:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate insights" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
