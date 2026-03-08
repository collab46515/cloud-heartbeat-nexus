import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Json = Record<string, any>;

type EvaluationContext = {
  claim: Json;
  patient: Json | null;
  payer: Json | null;
  provider: Json | null;
  lineItems: Json[];
  diagnoses: Json[];
  now: Date;
};

const OVERRIDE_MODIFIERS = ["25", "59", "XE", "XP", "XS", "XU"];

function getPathValue(obj: any, path?: string) {
  if (!path) return undefined;
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function evalLeafCondition(condition: Json, context: EvaluationContext, lineItem?: Json) {
  const sourceMap: Record<string, any> = {
    claim: context.claim,
    patient: context.patient,
    payer: context.payer,
    provider: context.provider,
    line_item: lineItem,
    diagnosis: context.diagnoses,
  };

  const value = getPathValue(sourceMap[condition.source || "claim"], condition.field);
  const target = condition.value;

  switch (condition.operator) {
    case "is_null":
      return value == null || value === "";
    case "is_empty":
      return value == null || (Array.isArray(value) ? value.length === 0 : String(value).trim() === "");
    case "equals":
      return value === target;
    case "not_equals":
      return value !== target;
    case "greater_than":
      if (target === "today") return new Date(value) > context.now;
      return Number(value) > Number(target);
    case "less_than":
      return Number(value) < Number(target);
    case "contains":
      return Array.isArray(value) ? value.includes(target) : String(value || "").includes(String(target));
    case "regex":
      return typeof value === "string" && new RegExp(String(target)).test(value);
    default:
      return false;
  }
}

function evalExpression(expr: Json, context: EvaluationContext, lineItem?: Json): boolean {
  if (!expr) return false;
  if (expr.all && Array.isArray(expr.all)) return expr.all.every((item: Json) => evalExpression(item, context, lineItem));
  if (expr.any && Array.isArray(expr.any)) return expr.any.some((item: Json) => evalExpression(item, context, lineItem));
  if (expr.not) return !evalExpression(expr.not, context, lineItem);
  return evalLeafCondition(expr, context, lineItem);
}

async function evaluateGovernanceChecks(
  supabase: any,
  logic: Json,
  context: EvaluationContext,
) {
  const findings: { message: string; details?: Json; lineItemId?: string }[] = [];

  if (logic.check === "cci_edit_pair") {
    for (let i = 0; i < context.lineItems.length; i++) {
      for (let j = i + 1; j < context.lineItems.length; j++) {
        const a = context.lineItems[i];
        const b = context.lineItems[j];
        if (a.service_date !== b.service_date) continue;

        const { data: pair } = await supabase
          .from("cci_edit_pairs")
          .select("*")
          .eq("is_active", true)
          .or(`and(code_1.eq.${a.procedure_code},code_2.eq.${b.procedure_code}),and(code_1.eq.${b.procedure_code},code_2.eq.${a.procedure_code})`)
          .maybeSingle();

        if (pair) {
          const mods = [...(a.modifiers || []), ...(b.modifiers || [])];
          const hasOverride = mods.some((m: string) => OVERRIDE_MODIFIERS.includes(m));
          if (!pair.modifier_allowed || !hasOverride) {
            findings.push({
              message: `CCI edit violation for ${a.procedure_code}/${b.procedure_code}`,
              details: { pair_id: pair.id, procedure_a: a.procedure_code, procedure_b: b.procedure_code },
              lineItemId: a.id,
            });
          }
        }
      }
    }
  }

  if (logic.check === "mue_units") {
    for (const li of context.lineItems) {
      const { data: limit } = await supabase
        .from("mue_limits")
        .select("*")
        .eq("is_active", true)
        .eq("procedure_code", li.procedure_code)
        .maybeSingle();
      if (limit && Number(li.units) > Number(limit.max_units)) {
        findings.push({
          message: `${li.procedure_code}: ${li.units} units exceeds MUE max ${limit.max_units}`,
          details: { procedure_code: li.procedure_code, units: li.units, max_units: limit.max_units },
          lineItemId: li.id,
        });
      }
    }
  }

  if (logic.check === "ncci_edit_pair") {
    for (let i = 0; i < context.lineItems.length; i++) {
      for (let j = i + 1; j < context.lineItems.length; j++) {
        const a = context.lineItems[i];
        const b = context.lineItems[j];
        if (a.service_date !== b.service_date) continue;

        const { data: pair } = await supabase
          .from("ncci_edit_pairs")
          .select("*")
          .eq("is_active", true)
          .or(`and(primary_code.eq.${a.procedure_code},secondary_code.eq.${b.procedure_code}),and(primary_code.eq.${b.procedure_code},secondary_code.eq.${a.procedure_code})`)
          .maybeSingle();

        if (pair) {
          const mods = [...(a.modifiers || []), ...(b.modifiers || [])];
          const hasOverride = mods.some((m: string) => OVERRIDE_MODIFIERS.includes(m));
          if (!pair.modifier_allowed || !hasOverride) {
            findings.push({
              message: `NCCI edit violation for ${a.procedure_code}/${b.procedure_code}`,
              details: { pair_id: pair.id, primary_code: pair.primary_code, secondary_code: pair.secondary_code },
              lineItemId: a.id,
            });
          }
        }
      }
    }
  }

  if (logic.check === "has_primary_diagnosis") {
    const hasPrimary = context.diagnoses.some((d) => d.rank === "primary" || d.primary === true);
    if (!hasPrimary) findings.push({ message: "Missing primary diagnosis" });
  }

  if (logic.check === "prior_auth_required") {
    const requiresAuth = context.lineItems.some((li) => Number(li.charge_amount) > 2500);
    if (requiresAuth) findings.push({ message: "Potential prior authorization requirement based on high-charge procedure" });
  }

  if (logic.check === "timely_filing") {
    if (context.claim.timely_filing_deadline) {
      const deadline = new Date(context.claim.timely_filing_deadline);
      const daysLeft = Math.ceil((deadline.getTime() - context.now.getTime()) / 86400000);
      if (daysLeft >= 0 && daysLeft <= Number(logic.threshold_days || 14)) {
        findings.push({ message: `Timely filing deadline in ${daysLeft} day(s)`, details: { days_left: daysLeft } });
      }
    }
  }

  return findings;
}

async function applyAutoCorrection(
  supabase: any,
  claimId: string,
  action: Json,
  context: EvaluationContext,
) {
  if (!action) return { applied: false, message: "No action" };

  const actionType = action.action || action.type;

  if (actionType === "set_default" || actionType === "set_claim_field") {
    if (!action.field) return { applied: false, message: "Missing field" };
    const currentValue = context.claim[action.field];
    if (actionType === "set_default" && currentValue != null && currentValue !== "") {
      return { applied: false, message: "Default skipped (already set)" };
    }
    const { error } = await supabase.from("claims").update({ [action.field]: action.value }).eq("id", claimId);
    if (error) return { applied: false, message: error.message };
    return { applied: true, message: `Updated claim.${action.field}` };
  }

  if (actionType === "map_revenue_code" || actionType === "auto_map_revenue_code") {
    let appliedCount = 0;
    for (const li of context.lineItems) {
      if (li.revenue_code) continue;
      const { data: mapping } = await supabase
        .from("revenue_code_defaults")
        .select("revenue_code")
        .eq("is_active", true)
        .eq("procedure_code", li.procedure_code)
        .maybeSingle();
      if (mapping?.revenue_code) {
        const { error } = await supabase
          .from("claim_line_items")
          .update({ revenue_code: mapping.revenue_code })
          .eq("id", li.id);
        if (!error) appliedCount += 1;
      }
    }
    return {
      applied: appliedCount > 0,
      message: appliedCount > 0 ? `Auto-mapped revenue code on ${appliedCount} line item(s)` : "No mapping available",
    };
  }

  return { applied: false, message: `Unsupported action: ${actionType}` };
}

async function runAIClinicalValidation(context: EvaluationContext) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return [];

  const dxList = context.diagnoses.map((d: any) => `${d.code || ""}: ${d.description || "N/A"}`).join("\n");
  const pxList = context.lineItems
    .map((li: any) => `${li.procedure_code} (${li.procedure_description || "N/A"}) x${li.units}`)
    .join("\n");

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
          content: "You are a medical coding QA assistant. Return concise, actionable findings.",
        },
        {
          role: "user",
          content: `Check this claim for: diagnosis-procedure mismatch, upcoding risk, missing specificity, and E/M level mismatch.\n\nDiagnoses:\n${dxList}\n\nProcedures:\n${pxList}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "clinical_findings",
            description: "Structured clinical coding findings",
            parameters: {
              type: "object",
              properties: {
                findings: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      check: { type: "string", enum: ["dx_px_alignment", "upcoding_risk", "missing_secondary_dx", "em_level_support"] },
                      severity: { type: "string", enum: ["error", "warning", "info"] },
                      message: { type: "string" },
                    },
                    required: ["check", "severity", "message"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["findings"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "clinical_findings" } },
    }),
  });

  if (!aiResp.ok) {
    if (aiResp.status === 429 || aiResp.status === 402) {
      return [{ check: "ai_unavailable", severity: "info", message: `AI unavailable (${aiResp.status})` }];
    }
    return [];
  }

  const data = await aiResp.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return [];

  try {
    const parsed = JSON.parse(args);
    return parsed.findings || [];
  } catch {
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { claim_id } = await req.json();
    if (!claim_id) throw new Error("claim_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    await supabase.from("claims").update({ scrub_status: "running" }).eq("id", claim_id);

    const { data: claim, error: claimErr } = await supabase
      .from("claims")
      .select("*, patients(*), payers(*), providers(*), claim_line_items(*)")
      .eq("id", claim_id)
      .single();
    if (claimErr || !claim) throw new Error(`Claim not found: ${claimErr?.message || "unknown"}`);

    const { data: rules, error: ruleErr } = await supabase
      .from("scrub_rules")
      .select("*")
      .eq("is_active", true)
      .order("severity", { ascending: true });
    if (ruleErr) throw new Error(ruleErr.message);

    await supabase.from("scrub_results").delete().eq("claim_id", claim_id).eq("resolved", false);

    const context: EvaluationContext = {
      claim,
      patient: claim.patients,
      payer: claim.payers,
      provider: claim.providers,
      lineItems: claim.claim_line_items || [],
      diagnoses: Array.isArray(claim.diagnoses) ? claim.diagnoses : [],
      now: new Date(),
    };

    const findings: any[] = [];

    for (const rule of rules || []) {
      const logic = (rule.logic_expression || {}) as Json;
      const governanceHits = await evaluateGovernanceChecks(supabase, logic, context);

      if (governanceHits.length > 0) {
        for (const hit of governanceHits) {
          let autoCorrected = false;
          let correctionMessage: string | null = null;

          if (rule.auto_correct && rule.auto_correct_action) {
            const correction = await applyAutoCorrection(supabase, claim_id, rule.auto_correct_action, context);
            autoCorrected = correction.applied;
            correctionMessage = correction.message;
          }

          findings.push({
            claim_id,
            rule_id: rule.id,
            rule_code: rule.rule_code,
            rule_name: rule.rule_name,
            severity: rule.severity,
            message: hit.message,
            details: hit.details || {},
            line_item_id: hit.lineItemId || null,
            auto_corrected: autoCorrected,
            correction_applied: correctionMessage,
          });
        }
        continue;
      }

      // Generic JSONB evaluator fallback for rule expressions
      const lineHits = context.lineItems.filter((li) => evalExpression(logic, context, li));
      const claimHit = evalExpression(logic, context);

      if (claimHit || lineHits.length > 0) {
        const targets = lineHits.length > 0 ? lineHits : [null];

        for (const lineTarget of targets) {
          let autoCorrected = false;
          let correctionMessage: string | null = null;

          if (rule.auto_correct && rule.auto_correct_action) {
            const correction = await applyAutoCorrection(supabase, claim_id, rule.auto_correct_action, context);
            autoCorrected = correction.applied;
            correctionMessage = correction.message;
          }

          findings.push({
            claim_id,
            rule_id: rule.id,
            rule_code: rule.rule_code,
            rule_name: rule.rule_name,
            severity: rule.severity,
            message: rule.description || `${rule.rule_name} triggered`,
            details: { logic_expression: logic },
            line_item_id: lineTarget?.id || null,
            auto_corrected: autoCorrected,
            correction_applied: correctionMessage,
          });
        }
      }
    }

    // AI checks mapped back to AI rules
    const aiRules = Object.fromEntries((rules || []).filter((r: any) => r.rule_type === "ai_clinical").map((r: any) => [r.rule_code, r]));
    const aiCheckToRuleCode: Record<string, string> = {
      dx_px_alignment: "AI-001",
      upcoding_risk: "AI-002",
      missing_secondary_dx: "AI-003",
      em_level_support: "AI-004",
    };

    const aiFindings = await runAIClinicalValidation(context);
    for (const aiF of aiFindings) {
      const mapped = aiRules[aiCheckToRuleCode[aiF.check] || ""];
      if (!mapped) continue;
      findings.push({
        claim_id,
        rule_id: mapped.id,
        rule_code: mapped.rule_code,
        rule_name: mapped.rule_name,
        severity: aiF.severity || mapped.severity,
        message: aiF.message,
        details: { ai_generated: true },
        auto_corrected: false,
      });
    }

    if (findings.length > 0) {
      const { error } = await supabase.from("scrub_results").insert(findings);
      if (error) throw new Error(error.message);
    }

    const errors = findings.filter((f) => f.severity === "error").length;
    const warnings = findings.filter((f) => f.severity === "warning").length;
    const scrubStatus = findings.length === 0 ? "passed" : errors > 0 ? "failed" : "warnings";

    const { error: claimUpdateErr } = await supabase
      .from("claims")
      .update({
        scrub_status: scrubStatus,
        scrub_passed_at: scrubStatus === "passed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", claim_id);
    if (claimUpdateErr) throw new Error(claimUpdateErr.message);

    return new Response(
      JSON.stringify({
        claim_id,
        scrub_status: scrubStatus,
        total_findings: findings.length,
        errors,
        warnings,
        info: findings.filter((f) => f.severity === "info").length,
        auto_corrected: findings.filter((f) => f.auto_corrected).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("scrub-claim error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
