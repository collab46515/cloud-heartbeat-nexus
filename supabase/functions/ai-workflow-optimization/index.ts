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

    const body = await req.json();

    // Fetch actionable claims requiring attention
    const { data: pendingClaims } = await supabase
      .from("claims")
      .select(`
        id, claim_number, claim_status, total_charge_amount, days_in_ar,
        ai_risk_score, ai_risk_level, denial_reason_code, timely_filing_deadline,
        payer_id, patient_id, service_date, scrub_status,
        payers(name, payer_type, avg_days_to_pay),
        patients(first_name, last_name, mrn)
      `)
      .in("claim_status", ["draft", "scrubbing", "ready", "submitted", "rejected", "denied", "in_review", "pending"])
      .order("total_charge_amount", { ascending: false })
      .limit(200);

    // Fetch denial workflows needing action
    const { data: openDenials } = await supabase
      .from("denial_workflows")
      .select(`
        id, denial_amount, denial_category, appeal_status, appeal_deadline,
        carc_code, carc_description,
        claims(claim_number, total_charge_amount, payer_id, payers(name))
      `)
      .in("appeal_status", ["new", "in_progress", "pending_review"])
      .order("denial_amount", { ascending: false })
      .limit(100);

    // Fetch recent scrub results needing resolution
    const { data: openScrubs } = await supabase
      .from("scrub_results")
      .select("id, claim_id, severity, message, rule_name")
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(50);

    // Summarize workload
    const workloadSummary = {
      claims_needing_action: (pendingClaims || []).map((c: any) => ({
        claim_number: c.claim_number,
        status: c.claim_status,
        charge: Number(c.total_charge_amount),
        days_in_ar: c.days_in_ar,
        ai_risk: c.ai_risk_level,
        ai_risk_score: Number(c.ai_risk_score),
        payer: c.payers?.name,
        patient: c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : null,
        scrub_status: c.scrub_status,
        timely_filing_deadline: c.timely_filing_deadline,
        denial_reason: c.denial_reason_code,
      })),
      open_denials: (openDenials || []).map((d: any) => ({
        amount: Number(d.denial_amount),
        category: d.denial_category,
        appeal_status: d.appeal_status,
        appeal_deadline: d.appeal_deadline,
        carc: d.carc_code,
        claim_number: d.claims?.claim_number,
        payer: d.claims?.payers?.name,
      })),
      unresolved_scrub_findings: openScrubs?.length || 0,
      total_revenue_at_risk: (pendingClaims || [])
        .filter((c: any) => c.ai_risk_level === "high" || c.ai_risk_level === "critical")
        .reduce((s: number, c: any) => s + Number(c.total_charge_amount), 0),
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
            content: `You are an expert RCM workflow optimization AI. Analyze the current workload and produce an AI-prioritized task list for billing staff. Prioritize by: 1) Revenue at risk, 2) Timely filing deadlines, 3) Success probability, 4) Effort required. Be specific about which claims to work first and why.`,
          },
          {
            role: "user",
            content: `Analyze this workload and produce an optimized task list with priorities and expected outcomes.\n\nWORKLOAD:\n${JSON.stringify(workloadSummary, null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_optimized_worklist",
              description: "Submit the AI-optimized worklist",
              parameters: {
                type: "object",
                properties: {
                  prioritized_tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        priority_rank: { type: "number" },
                        task_type: { type: "string", enum: ["denial_appeal", "scrub_fix", "claim_review", "payer_followup", "coding_correction", "timely_filing_urgent", "payment_posting"] },
                        claim_number: { type: "string" },
                        action: { type: "string" },
                        reason: { type: "string" },
                        revenue_at_stake: { type: "number" },
                        success_probability: { type: "number", description: "0.0-1.0" },
                        estimated_time_minutes: { type: "number" },
                        urgency: { type: "string", enum: ["critical", "high", "medium", "low"] },
                      },
                      required: ["priority_rank", "task_type", "action", "reason", "urgency"],
                    },
                  },
                  daily_summary: {
                    type: "object",
                    properties: {
                      total_tasks: { type: "number" },
                      critical_tasks: { type: "number" },
                      total_revenue_at_risk: { type: "number" },
                      estimated_recoverable: { type: "number" },
                      estimated_total_time_hours: { type: "number" },
                      top_priority_action: { type: "string" },
                    },
                    required: ["total_tasks", "critical_tasks", "total_revenue_at_risk", "top_priority_action"],
                  },
                  workflow_insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        insight: { type: "string" },
                        category: { type: "string", enum: ["bottleneck", "opportunity", "risk", "efficiency"] },
                        impact: { type: "string" },
                      },
                      required: ["insight", "category"],
                    },
                  },
                  staffing_recommendation: {
                    type: "object",
                    properties: {
                      workload_level: { type: "string", enum: ["light", "normal", "heavy", "overloaded"] },
                      recommendation: { type: "string" },
                      focus_areas: { type: "array", items: { type: "string" } },
                    },
                    required: ["workload_level", "recommendation"],
                  },
                },
                required: ["prioritized_tasks", "daily_summary", "workflow_insights", "staffing_recommendation"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_optimized_worklist" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return a worklist");

    const worklist = JSON.parse(toolCall.function.arguments);
    const latencyMs = Date.now() - startTime;

    return new Response(
      JSON.stringify({ worklist, latency_ms: latencyMs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Workflow optimization error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
