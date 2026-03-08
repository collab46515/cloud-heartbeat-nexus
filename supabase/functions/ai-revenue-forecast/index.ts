import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { period = "90_days" } = await req.json();

    // Gather historical data
    const { data: claims } = await supabase
      .from("claims")
      .select("claim_status, total_charge_amount, total_paid_amount, days_in_ar, payer_id, service_date, submission_date, created_at")
      .order("service_date", { ascending: false })
      .limit(1000);

    const { data: payers } = await supabase
      .from("payers")
      .select("id, name, payer_type, denial_rate, avg_days_to_pay")
      .eq("is_active", true);

    const { data: denials } = await supabase
      .from("denial_workflows")
      .select("denial_amount, denial_category, appeal_status, created_at, resolved_at")
      .order("created_at", { ascending: false })
      .limit(500);

    const { data: payments } = await supabase
      .from("patient_payments")
      .select("amount, payment_date, payment_method, status")
      .order("payment_date", { ascending: false })
      .limit(500);

    // Build monthly aggregations
    const monthlyMap: Record<string, { charges: number; paid: number; claims: number; denied: number }> = {};
    (claims || []).forEach((c) => {
      const m = c.service_date?.substring(0, 7) || "unknown";
      if (!monthlyMap[m]) monthlyMap[m] = { charges: 0, paid: 0, claims: 0, denied: 0 };
      monthlyMap[m].charges += Number(c.total_charge_amount);
      monthlyMap[m].paid += Number(c.total_paid_amount);
      monthlyMap[m].claims += 1;
      if (c.claim_status === "denied") monthlyMap[m].denied += 1;
    });

    const monthlyTrend = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        month,
        ...d,
        denial_rate: d.claims > 0 ? (d.denied / d.claims) : 0,
        collection_rate: d.charges > 0 ? (d.paid / d.charges) : 0,
      }));

    // Payer breakdown
    const payerBreakdown = (payers || []).map((p) => {
      const payerClaims = (claims || []).filter((c) => c.payer_id === p.id);
      const totalCharged = payerClaims.reduce((s, c) => s + Number(c.total_charge_amount), 0);
      const totalPaid = payerClaims.reduce((s, c) => s + Number(c.total_paid_amount), 0);
      const deniedCount = payerClaims.filter((c) => c.claim_status === "denied").length;
      return {
        payer_name: p.name,
        payer_type: p.payer_type,
        claim_count: payerClaims.length,
        total_charged: totalCharged,
        total_paid: totalPaid,
        denial_rate: payerClaims.length > 0 ? deniedCount / payerClaims.length : 0,
        avg_days_to_pay: p.avg_days_to_pay,
      };
    }).filter((p) => p.claim_count > 0);

    // Denial category breakdown
    const denialByCat: Record<string, { count: number; amount: number; appealed: number; won: number }> = {};
    (denials || []).forEach((d) => {
      if (!denialByCat[d.denial_category]) denialByCat[d.denial_category] = { count: 0, amount: 0, appealed: 0, won: 0 };
      denialByCat[d.denial_category].count += 1;
      denialByCat[d.denial_category].amount += Number(d.denial_amount);
      if (d.appeal_status && d.appeal_status !== "new") denialByCat[d.denial_category].appealed += 1;
      if (d.appeal_status === "won") denialByCat[d.denial_category].won += 1;
    });

    const contextSummary = {
      period,
      total_claims: claims?.length || 0,
      monthly_trend: monthlyTrend.slice(-12),
      payer_breakdown: payerBreakdown,
      denial_categories: denialByCat,
      patient_payment_volume: payments?.length || 0,
      patient_payment_total: (payments || []).reduce((s, p) => s + Number(p.amount), 0),
    };

    const startTime = Date.now();

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert healthcare Revenue Cycle Management financial analyst. Analyze historical claim, payment, and denial data to produce actionable revenue forecasts, risk scenarios, and optimization recommendations. Be specific with dollar amounts and percentages.`,
          },
          {
            role: "user",
            content: `Analyze this RCM data and produce a comprehensive revenue forecast with risk scenarios and optimization opportunities.\n\nDATA:\n${JSON.stringify(contextSummary, null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_revenue_forecast",
              description: "Submit the revenue forecast analysis",
              parameters: {
                type: "object",
                properties: {
                  forecast_30_day: {
                    type: "object",
                    properties: {
                      expected_revenue: { type: "number" },
                      confidence_low: { type: "number" },
                      confidence_high: { type: "number" },
                      expected_collections: { type: "number" },
                      expected_denials: { type: "number" },
                    },
                    required: ["expected_revenue", "confidence_low", "confidence_high"],
                  },
                  forecast_90_day: {
                    type: "object",
                    properties: {
                      expected_revenue: { type: "number" },
                      confidence_low: { type: "number" },
                      confidence_high: { type: "number" },
                    },
                    required: ["expected_revenue", "confidence_low", "confidence_high"],
                  },
                  risk_scenarios: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        scenario: { type: "string" },
                        probability: { type: "number", description: "0.0-1.0" },
                        revenue_impact: { type: "number", description: "Negative for loss, positive for gain" },
                        description: { type: "string" },
                        mitigation: { type: "string" },
                      },
                      required: ["scenario", "probability", "revenue_impact", "description"],
                    },
                  },
                  optimization_opportunities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        opportunity: { type: "string" },
                        potential_revenue: { type: "number" },
                        effort: { type: "string", enum: ["low", "medium", "high"] },
                        timeframe: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["opportunity", "potential_revenue", "effort", "description"],
                    },
                  },
                  payer_insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        payer_name: { type: "string" },
                        insight: { type: "string" },
                        action: { type: "string" },
                        revenue_opportunity: { type: "number" },
                      },
                      required: ["payer_name", "insight", "action"],
                    },
                  },
                  key_metrics_assessment: {
                    type: "object",
                    properties: {
                      collection_rate_trend: { type: "string", enum: ["improving", "stable", "declining"] },
                      denial_rate_trend: { type: "string", enum: ["improving", "stable", "worsening"] },
                      ar_days_trend: { type: "string", enum: ["improving", "stable", "worsening"] },
                      overall_health: { type: "string", enum: ["excellent", "good", "fair", "poor", "critical"] },
                      summary: { type: "string" },
                    },
                    required: ["collection_rate_trend", "denial_rate_trend", "ar_days_trend", "overall_health", "summary"],
                  },
                },
                required: ["forecast_30_day", "forecast_90_day", "risk_scenarios", "optimization_opportunities", "key_metrics_assessment"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_revenue_forecast" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return a forecast");

    const forecast = JSON.parse(toolCall.function.arguments);
    const latencyMs = Date.now() - startTime;

    return new Response(
      JSON.stringify({ forecast, latency_ms: latencyMs, data_points: contextSummary.total_claims }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Revenue forecast error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
