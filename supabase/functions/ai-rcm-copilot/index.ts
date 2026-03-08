import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch summary stats for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [claimsRes, denialsRes, patientsRes] = await Promise.all([
      supabase.from("claims").select("id, claim_status, total_charge_amount, days_in_ar, ai_risk_level", { count: "exact" }).limit(50),
      supabase.from("denial_workflows").select("id, denial_category, denial_amount, appeal_status", { count: "exact" }).limit(30),
      supabase.from("patients").select("id", { count: "exact" }).limit(1),
    ]);

    const totalClaims = claimsRes.count || 0;
    const recentClaims = claimsRes.data || [];
    const highRiskClaims = recentClaims.filter((c: any) => c.ai_risk_level === "high" || c.ai_risk_level === "critical").length;
    const totalCharges = recentClaims.reduce((s: number, c: any) => s + Number(c.total_charge_amount || 0), 0);
    const avgDaysAR = recentClaims.length > 0
      ? Math.round(recentClaims.reduce((s: number, c: any) => s + (c.days_in_ar || 0), 0) / recentClaims.length)
      : 0;

    const totalDenials = denialsRes.count || 0;
    const openDenials = (denialsRes.data || []).filter((d: any) => d.appeal_status !== "resolved").length;
    const denialAmount = (denialsRes.data || []).reduce((s: number, d: any) => s + Number(d.denial_amount || 0), 0);

    const totalPatients = patientsRes.count || 0;

    const systemPrompt = `You are the RCM Copilot — an expert AI assistant for Revenue Cycle Management built into the RCM360 platform.

CURRENT SYSTEM STATS (Live):
- Total Claims: ${totalClaims} | High-Risk Claims: ${highRiskClaims} | Avg Days in AR: ${avgDaysAR}
- Total Charges (recent): $${totalCharges.toLocaleString()}
- Denials: ${totalDenials} total | ${openDenials} open | $${denialAmount.toLocaleString()} at risk
- Patients: ${totalPatients}

CAPABILITIES YOU CAN HELP WITH:
1. Denial Prevention — Analyze claims for denial risk before submission
2. Clinical Coding — AI-assisted code suggestions and CDI opportunities
3. Payment Intelligence — Patient payment likelihood and optimal collection strategies
4. Appeal Generation — Draft appeal letters for denied claims
5. RTA Prediction — Recommend real-time vs batch submission routing
6. Anomaly Detection — Identify fraud, coding anomalies, payment irregularities
7. Revenue Forecasting — Predict future revenue, cash flow, and risk scenarios
8. Workflow Optimization — Prioritize worklists for maximum revenue recovery

RESPONSE GUIDELINES:
- Be concise and actionable. Use bullet points and bold for key numbers.
- When referencing financial amounts, always format as currency ($X,XXX).
- Suggest specific next steps the user can take within the platform.
- If the user asks about a specific claim or patient, explain what data you'd need.
- Use markdown formatting: headers, bold, bullet lists, tables when helpful.
- Be proactive: if you see opportunities in the stats, mention them.
- Sign off suggestions with which AI capability they map to (e.g., "→ Use Denial Prediction").
- Keep responses under 300 words unless the user asks for detail.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("RCM Copilot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
