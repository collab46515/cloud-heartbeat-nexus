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

    const { scan_type = "full" } = await req.json();

    // Gather statistical data for anomaly detection
    // 1. Claims by provider - look for unusual patterns
    const { data: providerClaims } = await supabase
      .from("claims")
      .select("provider_id, claim_status, total_charge_amount, claim_type, service_date, providers(first_name, last_name, specialty)")
      .order("created_at", { ascending: false })
      .limit(500);

    // 2. Recent denial spikes
    const { data: recentClaims } = await supabase
      .from("claims")
      .select("claim_status, payer_id, total_charge_amount, payers(name)")
      .order("created_at", { ascending: false })
      .limit(200);

    // 3. Payment anomalies
    const { data: payments } = await supabase
      .from("patient_payments")
      .select("amount, payment_method, patient_id, payment_date, status")
      .order("created_at", { ascending: false })
      .limit(200);

    // 4. Coding patterns
    const { data: lineItems } = await supabase
      .from("claim_line_items")
      .select("procedure_code, charge_amount, units, modifiers, claim_id")
      .order("created_at", { ascending: false })
      .limit(500);

    // Build summary stats
    const providerStats: Record<string, any> = {};
    providerClaims?.forEach((c: any) => {
      const pid = c.provider_id || "unknown";
      if (!providerStats[pid]) {
        providerStats[pid] = {
          name: c.providers ? `${c.providers.first_name} ${c.providers.last_name}` : "Unknown",
          specialty: c.providers?.specialty,
          total_claims: 0, denied: 0, total_charges: 0, cpt_frequency: {} as Record<string, number>,
        };
      }
      providerStats[pid].total_claims++;
      if (c.claim_status === "denied") providerStats[pid].denied++;
      providerStats[pid].total_charges += Number(c.total_charge_amount);
    });

    const payerDenialRates: Record<string, any> = {};
    recentClaims?.forEach((c: any) => {
      const pid = c.payer_id;
      if (!payerDenialRates[pid]) {
        payerDenialRates[pid] = { name: c.payers?.name, total: 0, denied: 0 };
      }
      payerDenialRates[pid].total++;
      if (c.claim_status === "denied") payerDenialRates[pid].denied++;
    });

    const cptFrequency: Record<string, { count: number; total_charge: number; avg_charge: number }> = {};
    lineItems?.forEach((li: any) => {
      const code = li.procedure_code;
      if (!cptFrequency[code]) cptFrequency[code] = { count: 0, total_charge: 0, avg_charge: 0 };
      cptFrequency[code].count++;
      cptFrequency[code].total_charge += Number(li.charge_amount);
    });
    Object.values(cptFrequency).forEach(v => { v.avg_charge = v.total_charge / v.count; });

    const analysisData = {
      provider_statistics: Object.entries(providerStats).slice(0, 20).map(([id, s]: any) => ({
        provider_id: id,
        name: s.name,
        specialty: s.specialty,
        total_claims: s.total_claims,
        denial_rate: s.total_claims > 0 ? (s.denied / s.total_claims * 100).toFixed(1) + "%" : "0%",
        avg_charge: s.total_claims > 0 ? (s.total_charges / s.total_claims).toFixed(2) : "0",
      })),
      payer_denial_rates: Object.entries(payerDenialRates).map(([id, s]: any) => ({
        payer_id: id,
        name: s.name,
        total_claims: s.total,
        denial_rate: s.total > 0 ? (s.denied / s.total * 100).toFixed(1) + "%" : "0%",
      })),
      top_cpt_codes: Object.entries(cptFrequency)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 20)
        .map(([code, stats]) => ({ code, ...stats })),
      total_claims_analyzed: providerClaims?.length || 0,
      total_payments_analyzed: payments?.length || 0,
      scan_type,
    };

    const startTime = Date.now();

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a healthcare fraud and anomaly detection expert. Analyze RCM data to identify:
1. CODING ANOMALIES: Upcoding, unbundling, impossible code combinations, unusual CPT frequency
2. PROVIDER ANOMALIES: Billing patterns deviating from peers, unusually high denial rates, volume spikes
3. PAYMENT ANOMALIES: Overpayments, duplicate payments, unusual refund patterns
4. PAYER ANOMALIES: Sudden denial rate changes, payment timing shifts
5. COMPLIANCE RISKS: Patterns suggesting audit risk, documentation gaps

Be specific and cite data. Only flag genuine statistical outliers, not normal variation.`,
          },
          {
            role: "user",
            content: `Analyze this RCM data for anomalies and fraud indicators:\n\n${JSON.stringify(analysisData, null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_anomaly_report",
              description: "Submit the anomaly detection results",
              parameters: {
                type: "object",
                properties: {
                  overall_risk_score: { type: "number", description: "Overall risk score 0-100" },
                  anomalies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Unique anomaly identifier" },
                        severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                        category: { type: "string", enum: ["coding", "provider", "payment", "payer", "compliance"] },
                        title: { type: "string", description: "Short anomaly title" },
                        description: { type: "string", description: "Detailed description with evidence" },
                        affected_entity: { type: "string", description: "Provider name, payer, or CPT code affected" },
                        metric_value: { type: "string", description: "The anomalous metric value" },
                        expected_range: { type: "string", description: "Normal/expected range for this metric" },
                        recommended_action: { type: "string", description: "What to do about it" },
                        estimated_financial_impact: { type: "number", description: "Dollar impact estimate" },
                      },
                      required: ["id", "severity", "category", "title", "description", "recommended_action"],
                    },
                  },
                  summary: { type: "string", description: "Executive summary of findings" },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Top-level recommendations",
                  },
                },
                required: ["overall_risk_score", "anomalies", "summary", "recommendations"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_anomaly_report" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return results");

    const report = JSON.parse(toolCall.function.arguments);
    const latencyMs = Date.now() - startTime;

    // Log to audit
    await supabase.from("audit_log").insert({
      entity_type: "anomaly_scan",
      action: "AI anomaly detection scan completed",
      details: {
        scan_type,
        anomalies_found: report.anomalies?.length || 0,
        overall_risk_score: report.overall_risk_score,
        latency_ms: latencyMs,
      },
    });

    return new Response(
      JSON.stringify({ report: { ...report, latency_ms: latencyMs, scanned_at: new Date().toISOString() } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Anomaly detection error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
