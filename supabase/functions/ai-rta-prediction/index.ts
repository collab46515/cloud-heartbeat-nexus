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

    const { claim_id } = await req.json();
    if (!claim_id) throw new Error("claim_id is required");

    // Fetch claim with relations
    const { data: claim, error: claimErr } = await supabase
      .from("claims")
      .select(`*, patients(first_name, last_name, dob, gender, insurance), payers(name, payer_type, denial_rate, avg_days_to_pay), providers(first_name, last_name, npi, specialty), claim_line_items(*)`)
      .eq("id", claim_id)
      .single();
    if (claimErr || !claim) throw new Error("Claim not found");

    // Fetch RTA config for this payer
    const { data: rtaConfig } = await supabase
      .from("payer_rta_config")
      .select("*")
      .eq("payer_id", claim.payer_id)
      .maybeSingle();

    // Fetch historical RTA transactions for this payer
    const { data: rtaHistory } = await supabase
      .from("rta_transactions")
      .select("response_status, response_time_ms, plan_pays, patient_responsibility")
      .eq("payer_id", claim.payer_id)
      .limit(100);

    const rtaApprovalRate = rtaHistory?.length
      ? rtaHistory.filter(t => t.response_status === "approved").length / rtaHistory.length
      : 0.85;

    const avgRtaResponseMs = rtaHistory?.length
      ? Math.round(rtaHistory.reduce((s, t) => s + (t.response_time_ms || 0), 0) / rtaHistory.length)
      : 1500;

    // Fetch provider RTA success
    const { data: providerRta } = await supabase
      .from("rta_transactions")
      .select("response_status")
      .eq("claim_id", claim_id)
      .limit(50);

    const featureSummary = {
      claim: {
        claim_number: claim.claim_number,
        claim_type: claim.claim_type,
        total_charge: Number(claim.total_charge_amount),
        service_date: claim.service_date,
        line_items: claim.claim_line_items?.map((li: any) => ({
          procedure_code: li.procedure_code,
          description: li.procedure_description,
          charge: Number(li.charge_amount),
          units: li.units,
          modifiers: li.modifiers,
        })),
        diagnoses: claim.diagnoses,
      },
      payer: {
        name: claim.payers?.name,
        type: claim.payers?.payer_type,
        denial_rate: claim.payers?.denial_rate,
        avg_days_to_pay: claim.payers?.avg_days_to_pay,
      },
      rta_config: {
        rta_enabled: rtaConfig?.rta_enabled || false,
        max_charge_amount: rtaConfig?.max_charge_amount,
        supported_claim_types: rtaConfig?.supported_claim_types,
        success_rate: rtaConfig?.success_rate,
        avg_response_time_ms: rtaConfig?.avg_response_time_ms,
        timeout_seconds: rtaConfig?.timeout_seconds,
        fallback_to_batch: rtaConfig?.fallback_to_batch,
      },
      historical: {
        payer_rta_approval_rate: (rtaApprovalRate * 100).toFixed(1) + "%",
        avg_rta_response_ms: avgRtaResponseMs,
        total_rta_transactions: rtaHistory?.length || 0,
      },
      patient: {
        insurance_type: claim.patients?.insurance,
        gender: claim.patients?.gender,
      },
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
            content: `You are a healthcare RCM expert specializing in Real-Time Adjudication (RTA) routing decisions. Analyze claims to determine if they should be submitted via RTA (instant payer adjudication) or batch (traditional 14-30 day processing). Consider payer RTA capabilities, claim complexity, charge amounts, historical success rates, and expected payment breakdowns.`,
          },
          {
            role: "user",
            content: `Analyze this claim for RTA readiness and predict the outcome.\n\nCLAIM DATA:\n${JSON.stringify(featureSummary, null, 2)}\n\nProvide your RTA routing recommendation.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_rta_prediction",
              description: "Submit the RTA readiness prediction for a healthcare claim",
              parameters: {
                type: "object",
                properties: {
                  rta_recommended: { type: "boolean", description: "Whether RTA submission is recommended" },
                  confidence: { type: "number", description: "Confidence in recommendation 0.0-1.0" },
                  expected_approval_probability: { type: "number", description: "Probability of RTA approval 0.0-1.0" },
                  expected_response_time_ms: { type: "number", description: "Expected response time in milliseconds" },
                  expected_allowed_amount: { type: "number", description: "Expected allowed amount in dollars" },
                  expected_patient_responsibility: { type: "number", description: "Expected patient responsibility in dollars" },
                  expected_plan_pays: { type: "number", description: "Expected plan payment in dollars" },
                  recommendation_reason: { type: "string", description: "Brief explanation of why RTA is or isn't recommended" },
                  risk_factors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        factor: { type: "string" },
                        impact: { type: "string", enum: ["positive", "negative", "neutral"] },
                        description: { type: "string" },
                      },
                      required: ["factor", "impact", "description"],
                    },
                  },
                  batch_comparison: {
                    type: "object",
                    properties: {
                      expected_days_to_payment: { type: "number" },
                      expected_approval_rate: { type: "number" },
                      recommendation: { type: "string" },
                    },
                    required: ["expected_days_to_payment", "expected_approval_rate"],
                  },
                },
                required: ["rta_recommended", "confidence", "expected_approval_probability", "recommendation_reason", "risk_factors", "batch_comparison"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_rta_prediction" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
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
    if (!toolCall) throw new Error("AI did not return a prediction");

    const prediction = JSON.parse(toolCall.function.arguments);
    const latencyMs = Date.now() - startTime;

    return new Response(
      JSON.stringify({ prediction: { ...prediction, latency_ms: latencyMs } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("RTA prediction error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
