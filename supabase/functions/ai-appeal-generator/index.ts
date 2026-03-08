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

    const { denial_id } = await req.json();
    if (!denial_id) throw new Error("denial_id is required");

    // Fetch denial with claim context
    const { data: denial, error: denialErr } = await supabase
      .from("denial_workflows")
      .select(`
        *,
        claims(
          claim_number, claim_type, total_charge_amount, service_date, diagnoses, facility_name,
          patients(first_name, last_name, dob, gender, mrn),
          payers(name, payer_type),
          providers(first_name, last_name, npi, specialty),
          claim_line_items(procedure_code, procedure_description, modifiers, units, charge_amount, diagnosis_pointer)
        )
      `)
      .eq("id", denial_id)
      .single();

    if (denialErr || !denial) throw new Error("Denial not found");

    // Fetch historical appeal success for this denial category + payer
    const payerName = denial.claims?.payers?.name;
    const { data: historicalAppeals } = await supabase
      .from("denial_workflows")
      .select("appeal_status, denial_category")
      .eq("denial_category", denial.denial_category)
      .in("appeal_status", ["appeal_approved", "appeal_denied", "closed"])
      .limit(100);

    const totalResolved = historicalAppeals?.length || 0;
    const totalOverturned = historicalAppeals?.filter(a => a.appeal_status === "appeal_approved").length || 0;
    const historicalSuccessRate = totalResolved > 0 ? (totalOverturned / totalResolved * 100).toFixed(0) : "N/A";

    const context = {
      denial: {
        category: denial.denial_category,
        carc_code: denial.carc_code,
        carc_description: denial.carc_description,
        rarc_code: denial.rarc_code,
        rarc_description: denial.rarc_description,
        group_code: denial.group_code,
        amount: Number(denial.denial_amount),
        appeal_level: denial.appeal_level,
        appeal_deadline: denial.appeal_deadline,
      },
      claim: {
        number: denial.claims?.claim_number,
        type: denial.claims?.claim_type,
        total_charge: Number(denial.claims?.total_charge_amount),
        service_date: denial.claims?.service_date,
        diagnoses: denial.claims?.diagnoses,
        facility: denial.claims?.facility_name,
        line_items: denial.claims?.claim_line_items?.map((li: any) => ({
          code: li.procedure_code,
          description: li.procedure_description,
          modifiers: li.modifiers,
          units: li.units,
          charge: Number(li.charge_amount),
        })),
      },
      patient: {
        name: denial.claims?.patients ? `${denial.claims.patients.first_name} ${denial.claims.patients.last_name}` : null,
        dob: denial.claims?.patients?.dob,
        mrn: denial.claims?.patients?.mrn,
      },
      payer: {
        name: payerName,
        type: denial.claims?.payers?.payer_type,
      },
      provider: {
        name: denial.claims?.providers ? `${denial.claims.providers.first_name} ${denial.claims.providers.last_name}` : null,
        npi: denial.claims?.providers?.npi,
        specialty: denial.claims?.providers?.specialty,
      },
      historical_success_rate: `${historicalSuccessRate}%`,
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
            content: `You are an expert healthcare appeals specialist. Generate professional, evidence-based appeal letters for denied claims. Your letters should:

1. Reference specific CARC/RARC codes and explain why the denial is incorrect
2. Cite relevant medical policies, CMS guidelines, LCD/NCD references
3. Include clinical justification from the diagnosis and procedure codes
4. Reference medical necessity based on the patient's condition
5. Be formatted as a professional business letter
6. Include specific next steps and deadlines

Also provide a strategic assessment of the appeal's likelihood of success and recommended supporting documents.`,
          },
          {
            role: "user",
            content: `Generate an appeal letter and strategy for this denied claim.\n\n${JSON.stringify(context, null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_appeal",
              description: "Submit the generated appeal letter and strategy",
              parameters: {
                type: "object",
                properties: {
                  appeal_letter: { type: "string", description: "Complete professional appeal letter" },
                  success_likelihood: { type: "number", description: "Estimated success probability 0-1" },
                  strategy_summary: { type: "string", description: "Brief strategic assessment" },
                  key_arguments: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key arguments in the appeal",
                  },
                  supporting_documents_needed: {
                    type: "array",
                    items: { type: "string" },
                    description: "Documents to attach",
                  },
                  recommended_appeal_level: { type: "string", enum: ["first_level", "second_level", "external_review", "state_insurance_commissioner"] },
                  citations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Medical policy and guideline citations",
                  },
                },
                required: ["appeal_letter", "success_likelihood", "strategy_summary", "key_arguments", "supporting_documents_needed"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_appeal" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return an appeal");

    const result = JSON.parse(toolCall.function.arguments);

    // Save appeal letter to denial workflow
    await supabase
      .from("denial_workflows")
      .update({
        appeal_letter: result.appeal_letter,
        appeal_status: "appeal_drafted",
      })
      .eq("id", denial_id);

    // Audit log
    await supabase.from("claim_audit_log").insert({
      claim_id: denial.claim_id,
      action: "AI appeal letter generated",
      action_category: "ai_prediction",
      new_value: {
        denial_id,
        success_likelihood: result.success_likelihood,
        appeal_level: result.recommended_appeal_level,
      },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Appeal generation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
