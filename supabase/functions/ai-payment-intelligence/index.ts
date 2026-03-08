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

    const { patient_id } = await req.json();
    if (!patient_id) throw new Error("patient_id is required");

    // Fetch patient
    const { data: patient, error: patientErr } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patient_id)
      .single();
    if (patientErr || !patient) throw new Error("Patient not found");

    // Fetch payment history
    const { data: payments } = await supabase
      .from("patient_payments")
      .select("amount, payment_date, payment_method, status")
      .eq("patient_id", patient_id)
      .order("payment_date", { ascending: false })
      .limit(50);

    // Fetch active plans
    const { data: plans } = await supabase
      .from("patient_payment_plans")
      .select("*")
      .eq("patient_id", patient_id);

    // Fetch outstanding claims
    const { data: claims } = await supabase
      .from("claims")
      .select("id, claim_number, total_charge_amount, total_paid_amount, patient_responsibility, days_in_ar, claim_status, service_date")
      .eq("patient_id", patient_id)
      .in("claim_status", ["submitted", "in_process", "partially_paid"])
      .limit(20);

    const totalOutstanding = (claims || []).reduce((s, c) => s + Math.max(0, Number(c.patient_responsibility) - Number(c.total_paid_amount)), 0);

    const paymentHistory = {
      total_payments: payments?.length || 0,
      total_paid: payments?.reduce((s, p) => s + Number(p.amount), 0) || 0,
      methods_used: [...new Set(payments?.map(p => p.payment_method) || [])],
      avg_days_to_pay: payments?.length ? Math.round(payments.reduce((s, p, _i, arr) => {
        return s + 15; // simplified proxy
      }, 0) / payments.length) : null,
      has_defaulted_plan: plans?.some(p => p.status === "defaulted") || false,
      completed_plans: plans?.filter(p => p.status === "completed").length || 0,
    };

    const patientAge = patient.dob
      ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    const context = {
      patient: {
        age: patientAge,
        gender: patient.gender,
        insurance_type: patient.insurance,
      },
      payment_history: paymentHistory,
      outstanding_balance: totalOutstanding,
      open_claims_count: claims?.length || 0,
      active_plans: plans?.filter(p => p.status === "active").length || 0,
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
            content: `You are an AI patient financial counselor for a healthcare Revenue Cycle Management system. Analyze patient payment behavior and financial data to:

1. Predict payment likelihood at 30, 60, and 90 days
2. Recommend optimal payment plan structure (months, amount, autopay)
3. Determine best communication channel and message tone
4. Generate a personalized outreach message

Consider: payment history reliability, insurance type, balance relative to history, age demographics, and plan completion history. Be empathetic and compliant with healthcare billing regulations.`,
          },
          {
            role: "user",
            content: `Analyze this patient's financial profile and provide payment intelligence.\n\n${JSON.stringify(context, null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_payment_intelligence",
              description: "Submit payment likelihood prediction and engagement strategy",
              parameters: {
                type: "object",
                properties: {
                  payment_likelihood_30_days: { type: "number", description: "Probability of payment within 30 days (0-1)" },
                  payment_likelihood_60_days: { type: "number", description: "Probability of payment within 60 days (0-1)" },
                  payment_likelihood_90_days: { type: "number", description: "Probability of payment within 90 days (0-1)" },
                  risk_category: { type: "string", enum: ["low_risk", "medium_risk", "high_risk", "very_high_risk"] },
                  recommended_strategy: { type: "string", enum: ["immediate_full_payment", "proactive_payment_plan", "hardship_plan", "financial_counseling", "collections_referral"] },
                  optimal_plan: {
                    type: "object",
                    properties: {
                      months: { type: "number" },
                      monthly_amount: { type: "number" },
                      interest_rate: { type: "number" },
                      autopay_recommended: { type: "boolean" },
                      expected_completion_rate: { type: "number" },
                    },
                    required: ["months", "monthly_amount", "autopay_recommended"],
                  },
                  communication: {
                    type: "object",
                    properties: {
                      preferred_channel: { type: "string", enum: ["sms", "email", "phone", "mail"] },
                      message_tone: { type: "string", enum: ["professional", "empathetic", "urgent", "celebratory"] },
                      best_contact_time: { type: "string" },
                      personalized_message: { type: "string", description: "Ready-to-send patient message" },
                    },
                    required: ["preferred_channel", "message_tone", "personalized_message"],
                  },
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        insight: { type: "string" },
                        impact: { type: "string", enum: ["positive", "negative", "neutral"] },
                      },
                      required: ["insight", "impact"],
                    },
                  },
                },
                required: ["payment_likelihood_30_days", "payment_likelihood_90_days", "risk_category", "recommended_strategy", "optimal_plan", "communication", "insights"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_payment_intelligence" } },
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
    if (!toolCall) throw new Error("AI did not return intelligence");

    const result = JSON.parse(toolCall.function.arguments);

    // Audit log
    await supabase.from("audit_log").insert({
      entity_type: "patient",
      entity_id: patient_id,
      action: "AI payment intelligence generated",
      details: { risk_category: result.risk_category, strategy: result.recommended_strategy },
    });

    return new Response(JSON.stringify({ ...result, patient_id, outstanding_balance: totalOutstanding }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Payment intelligence error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
