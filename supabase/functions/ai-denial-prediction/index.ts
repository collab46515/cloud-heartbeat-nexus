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

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { claim_id } = await req.json();
    if (!claim_id) throw new Error("claim_id is required");

    // Fetch claim with relations
    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select(`
        *,
        patients(first_name, last_name, mrn, dob, gender, insurance),
        payers(name, payer_type, denial_rate, avg_days_to_pay),
        providers(first_name, last_name, npi, specialty),
        claim_line_items(*)
      `)
      .eq("id", claim_id)
      .single();

    if (claimError || !claim) throw new Error("Claim not found: " + claimError?.message);

    // Fetch historical denial data for this payer
    const { data: payerClaims } = await supabase
      .from("claims")
      .select("claim_status, denial_reason_code")
      .eq("payer_id", claim.payer_id)
      .limit(200);

    const payerDenialRate = payerClaims
      ? payerClaims.filter(c => c.claim_status === "denied").length / Math.max(payerClaims.length, 1)
      : 0;

    // Fetch provider historical performance
    const { data: providerClaims } = await supabase
      .from("claims")
      .select("claim_status")
      .eq("provider_id", claim.provider_id)
      .limit(200);

    const providerCleanRate = providerClaims
      ? providerClaims.filter(c => c.claim_status !== "denied").length / Math.max(providerClaims.length, 1)
      : 0.9;

    // Check for payer contract
    const { data: contract } = await supabase
      .from("payer_contracts")
      .select("timely_filing_days, contract_type")
      .eq("payer_id", claim.payer_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const timelyFilingDays = contract?.timely_filing_days || 90;
    const daysSinceService = Math.floor(
      (Date.now() - new Date(claim.service_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysToTimelyFiling = timelyFilingDays - daysSinceService;

    // Build feature summary for AI
    const featureSummary = {
      claim: {
        claim_number: claim.claim_number,
        claim_type: claim.claim_type,
        total_charge: Number(claim.total_charge_amount),
        service_date: claim.service_date,
        submission_date: claim.submission_date,
        days_in_ar: claim.days_in_ar,
        diagnoses: claim.diagnoses,
        line_items: claim.claim_line_items?.map((li: any) => ({
          procedure_code: li.procedure_code,
          description: li.procedure_description,
          modifiers: li.modifiers,
          units: li.units,
          charge: Number(li.charge_amount),
          diagnosis_pointer: li.diagnosis_pointer,
        })),
      },
      patient: {
        age: claim.patients?.dob
          ? Math.floor((Date.now() - new Date(claim.patients.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null,
        gender: claim.patients?.gender,
        insurance: claim.patients?.insurance,
      },
      payer: {
        name: claim.payers?.name,
        type: claim.payers?.payer_type,
        historical_denial_rate: (payerDenialRate * 100).toFixed(1) + "%",
        avg_days_to_pay: claim.payers?.avg_days_to_pay,
      },
      provider: {
        name: claim.providers ? `${claim.providers.first_name} ${claim.providers.last_name}` : null,
        specialty: claim.providers?.specialty,
        clean_claim_rate: (providerCleanRate * 100).toFixed(1) + "%",
      },
      context: {
        days_to_timely_filing: daysToTimelyFiling,
        days_since_service: daysSinceService,
        has_contract: !!contract,
      },
    };

    const startTime = Date.now();

    // Call AI for prediction
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
            content: `You are an expert healthcare Revenue Cycle Management AI specializing in claim denial prediction. Analyze claims and predict denial risk based on:
- Payer behavior patterns and denial rates
- CPT/ICD-10 coding appropriateness and bundling rules (CCI, MUE, NCCI)
- Documentation completeness indicators
- Modifier appropriateness
- Prior authorization requirements
- Medical necessity alignment
- Timely filing risk
- Provider historical performance

You must be specific about which CPT codes, modifiers, or diagnoses are at risk and why.`,
          },
          {
            role: "user",
            content: `Analyze this healthcare claim for denial risk. Provide your assessment as a structured response.

CLAIM DATA:
${JSON.stringify(featureSummary, null, 2)}

Analyze and respond with your denial risk assessment.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_denial_prediction",
              description: "Submit the denial risk prediction for a healthcare claim",
              parameters: {
                type: "object",
                properties: {
                  denial_probability: {
                    type: "number",
                    description: "Probability of denial from 0.0 to 1.0",
                  },
                  risk_level: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"],
                    description: "Overall risk level categorization",
                  },
                  confidence_lower: {
                    type: "number",
                    description: "Lower bound of confidence interval",
                  },
                  confidence_upper: {
                    type: "number",
                    description: "Upper bound of confidence interval",
                  },
                  risk_factors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        factor: { type: "string", description: "Name of the risk factor" },
                        score: { type: "number", description: "Risk score 0.0-1.0" },
                        description: { type: "string", description: "Detailed explanation" },
                        affected_codes: {
                          type: "array",
                          items: { type: "string" },
                          description: "CPT/ICD codes affected",
                        },
                      },
                      required: ["factor", "score", "description"],
                    },
                    description: "Top risk factors driving the prediction",
                  },
                  recommended_actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: { type: "string", description: "Recommended action" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        estimated_impact: { type: "string", description: "Expected impact if action taken" },
                      },
                      required: ["action", "priority"],
                    },
                    description: "Recommended actions to reduce denial risk",
                  },
                  revenue_at_risk: {
                    type: "number",
                    description: "Dollar amount at risk if denied",
                  },
                  revenue_protected_if_fixed: {
                    type: "number",
                    description: "Dollar amount protected if recommendations followed",
                  },
                },
                required: ["denial_probability", "risk_level", "risk_factors", "recommended_actions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_denial_prediction" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return a prediction");

    const prediction = JSON.parse(toolCall.function.arguments);
    const latencyMs = Date.now() - startTime;

    // Store prediction
    const { data: stored, error: storeError } = await supabase
      .from("ml_predictions")
      .insert({
        claim_id,
        prediction_type: "denial_risk",
        model_version: "lovable-ai-v1",
        denial_probability: prediction.denial_probability,
        risk_level: prediction.risk_level,
        confidence_lower: prediction.confidence_lower,
        confidence_upper: prediction.confidence_upper,
        risk_factors: prediction.risk_factors,
        recommended_actions: prediction.recommended_actions,
        feature_importances: featureSummary,
        prediction_latency_ms: latencyMs,
      })
      .select()
      .single();

    if (storeError) console.error("Failed to store prediction:", storeError);

    // Update claim with AI risk data
    await supabase
      .from("claims")
      .update({
        ai_risk_score: prediction.denial_probability,
        ai_risk_level: prediction.risk_level,
        ai_risk_factors: prediction.risk_factors,
        ai_recommended_actions: prediction.recommended_actions,
      })
      .eq("id", claim_id);

    // Create audit log entry
    await supabase.from("claim_audit_log").insert({
      claim_id,
      action: "AI denial prediction generated",
      action_category: "ai_prediction",
      new_value: {
        risk_level: prediction.risk_level,
        denial_probability: prediction.denial_probability,
        latency_ms: latencyMs,
      },
    });

    return new Response(
      JSON.stringify({
        prediction: {
          ...prediction,
          prediction_id: stored?.id,
          latency_ms: latencyMs,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Denial prediction error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
