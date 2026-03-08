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

    const { claim_id, clinical_text } = await req.json();
    if (!claim_id) throw new Error("claim_id is required");

    // Fetch claim data
    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select(`
        *,
        patients(first_name, last_name, dob, gender),
        payers(name, payer_type),
        providers(first_name, last_name, specialty),
        claim_line_items(*)
      `)
      .eq("id", claim_id)
      .single();

    if (claimError || !claim) throw new Error("Claim not found");

    const patientAge = claim.patients?.dob
      ? Math.floor((Date.now() - new Date(claim.patients.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    const claimContext = {
      patient: { age: patientAge, gender: claim.patients?.gender },
      payer: { name: claim.payers?.name, type: claim.payers?.payer_type },
      provider_specialty: claim.providers?.specialty,
      current_diagnoses: claim.diagnoses,
      current_procedures: claim.claim_line_items?.map((li: any) => ({
        code: li.procedure_code,
        description: li.procedure_description,
        modifiers: li.modifiers,
        units: li.units,
        charge: Number(li.charge_amount),
      })),
      service_date: claim.service_date,
      claim_type: claim.claim_type,
    };

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
            content: `You are an expert medical coder and Clinical Documentation Improvement (CDI) specialist. Analyze claims and clinical documentation to:

1. DIAGNOSIS CODING (ICD-10-CM):
   - Verify specificity (highest level available)
   - Check laterality, episode of care, severity
   - Identify missing complications/comorbidities (CC/MCC)
   - Suggest specificity upgrades

2. PROCEDURE CODING (CPT/HCPCS):
   - Validate E&M levels (1995/1997 guidelines + MDM-based 2021+)
   - Check modifier appropriateness (25, 59, 76, 77, etc.)
   - Identify bundling issues (CCI edits)
   - Flag MUE violations

3. CDI OPPORTUNITIES:
   - Documentation gaps affecting code specificity
   - Missing diagnoses supported by clinical evidence
   - Severity of Illness / Risk of Mortality opportunities (inpatient)
   - Revenue impact estimation

Always reference specific coding guidelines and provide evidence from the documentation.`,
          },
          {
            role: "user",
            content: `Analyze this healthcare claim for coding optimization and CDI opportunities.

CLAIM CONTEXT:
${JSON.stringify(claimContext, null, 2)}

${clinical_text ? `CLINICAL DOCUMENTATION:\n${clinical_text}` : "No additional clinical documentation provided. Analyze based on current codes and claim data."}

Provide your coding suggestions and CDI opportunities.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_coding_suggestions",
              description: "Submit coding suggestions and CDI opportunities",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        suggestion_type: {
                          type: "string",
                          enum: ["diagnosis", "procedure", "modifier", "cdi_query", "e_m_level"],
                        },
                        current_code: { type: "string", description: "Current code if replacing" },
                        suggested_code: { type: "string", description: "Suggested code" },
                        suggested_description: { type: "string" },
                        confidence: { type: "number", description: "0.0 to 1.0" },
                        evidence: { type: "string", description: "Evidence supporting suggestion" },
                        clinical_section: { type: "string", description: "Section of documentation" },
                        revenue_impact: { type: "number", description: "Estimated revenue impact in dollars" },
                      },
                      required: ["suggestion_type", "suggested_code", "suggested_description", "confidence", "evidence"],
                    },
                  },
                  overall_assessment: {
                    type: "string",
                    description: "Overall coding quality assessment",
                  },
                  total_revenue_impact: {
                    type: "number",
                    description: "Total estimated revenue impact across all suggestions",
                  },
                  coding_accuracy_score: {
                    type: "number",
                    description: "Current coding accuracy 0.0-1.0",
                  },
                },
                required: ["suggestions", "overall_assessment", "coding_accuracy_score"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_coding_suggestions" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return suggestions");

    const result = JSON.parse(toolCall.function.arguments);

    // Store suggestions
    if (result.suggestions?.length) {
      const rows = result.suggestions.map((s: any) => ({
        claim_id,
        suggestion_type: s.suggestion_type,
        current_code: s.current_code || null,
        suggested_code: s.suggested_code,
        suggested_description: s.suggested_description,
        confidence: s.confidence,
        evidence: s.evidence,
        clinical_section: s.clinical_section || null,
        revenue_impact: s.revenue_impact || 0,
        model_version: "lovable-ai-v1",
      }));

      await supabase.from("coding_suggestions").insert(rows);
    }

    // Audit log
    await supabase.from("claim_audit_log").insert({
      claim_id,
      action: "AI coding suggestions generated",
      action_category: "ai_prediction",
      new_value: {
        suggestion_count: result.suggestions?.length || 0,
        coding_accuracy: result.coding_accuracy_score,
        total_revenue_impact: result.total_revenue_impact,
      },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Coding suggestions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
