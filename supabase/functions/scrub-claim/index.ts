import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { claim_id } = await req.json();
    if (!claim_id) throw new Error("claim_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Fetch claim with related data
    const { data: claim, error: claimErr } = await supabase
      .from("claims")
      .select("*, patients(*), payers(*), providers(*), claim_line_items(*)")
      .eq("id", claim_id)
      .single();
    if (claimErr || !claim) throw new Error(`Claim not found: ${claimErr?.message}`);

    // 2. Fetch active scrub rules
    const { data: rules, error: rulesErr } = await supabase
      .from("scrub_rules")
      .select("*")
      .eq("is_active", true)
      .order("severity");
    if (rulesErr) throw new Error(`Rules fetch failed: ${rulesErr.message}`);

    // 3. Delete old unresolved scrub results for this claim
    await supabase
      .from("scrub_results")
      .delete()
      .eq("claim_id", claim_id)
      .eq("resolved", false);

    const findings: any[] = [];
    const patient = claim.patients;
    const payer = claim.payers;
    const provider = claim.providers;
    const lineItems = claim.claim_line_items || [];
    const diagnoses = (claim.diagnoses as any[]) || [];

    // ========== STRUCTURAL VALIDATION ==========
    function addFinding(rule: any, message: string, details: any = {}, autoCorrected = false, correction = "") {
      findings.push({
        claim_id,
        rule_id: rule.id,
        rule_code: rule.rule_code,
        rule_name: rule.rule_name,
        severity: rule.severity,
        message,
        details,
        auto_corrected: autoCorrected,
        correction_applied: correction || null,
      });
    }

    for (const rule of rules || []) {
      const logic = rule.logic_expression as any;

      switch (rule.rule_type) {
        case "structural": {
          if (rule.rule_code === "STR-001" && patient && !patient.dob) {
            addFinding(rule, "Patient date of birth is missing");
          }
          if (rule.rule_code === "STR-002" && (!diagnoses || diagnoses.length === 0)) {
            addFinding(rule, "No diagnosis codes attached to claim");
          }
          if (rule.rule_code === "STR-003" && !claim.service_date) {
            addFinding(rule, "Service date is missing from claim");
          }
          if (rule.rule_code === "STR-004" && provider && !provider.npi) {
            addFinding(rule, "Rendering provider NPI is missing");
          }
          if (rule.rule_code === "STR-005" && !claim.payer_id) {
            addFinding(rule, "No payer assigned to claim");
          }
          if (rule.rule_code === "STR-006" && Number(claim.total_charge_amount) === 0) {
            addFinding(rule, "Total charge amount is $0.00");
          }
          if (rule.rule_code === "STR-008" && claim.service_date) {
            const svcDate = new Date(claim.service_date);
            if (svcDate > new Date()) {
              addFinding(rule, `Service date ${claim.service_date} is in the future`);
            }
          }
          if (rule.rule_code === "STR-009" && lineItems.length === 0) {
            addFinding(rule, "Claim has no line items");
          }
          break;
        }

        case "cci":
        case "ncci": {
          // Check procedure code pairs for bundling violations
          if (lineItems.length >= 2) {
            for (let i = 0; i < lineItems.length; i++) {
              for (let j = i + 1; j < lineItems.length; j++) {
                const a = lineItems[i];
                const b = lineItems[j];
                const modsA = a.modifiers || [];
                const modsB = b.modifiers || [];
                const hasOverride = [...modsA, ...modsB].some((m: string) =>
                  ["25", "59", "XE", "XP", "XS", "XU"].includes(m)
                );
                // Flag if same service date and no override modifier
                if (a.service_date === b.service_date && !hasOverride) {
                  if (rule.rule_code === "CCI-003") {
                    addFinding(rule,
                      `Procedures ${a.procedure_code} and ${b.procedure_code} on same date without CCI override modifier`,
                      { code_a: a.procedure_code, code_b: b.procedure_code }
                    );
                  }
                }
              }
            }
          }
          if (rule.rule_code === "NCCI-002") {
            // Check add-on codes (common add-ons start with +)
            for (const li of lineItems) {
              const code = li.procedure_code;
              // Common add-on code ranges
              if (["99354", "99355", "99417", "22840", "22842", "20930", "20931"].includes(code)) {
                const hasPrimary = lineItems.some((other: any) => other.id !== li.id && other.service_date === li.service_date);
                if (!hasPrimary) {
                  addFinding(rule, `Add-on code ${code} billed without a primary procedure on same date`, { add_on_code: code });
                }
              }
            }
          }
          break;
        }

        case "mue": {
          for (const li of lineItems) {
            if (rule.rule_code === "MUE-001" && li.units > 4) {
              addFinding(rule,
                `${li.procedure_code}: ${li.units} units may exceed MUE threshold`,
                { procedure_code: li.procedure_code, units: li.units, line_item_id: li.id }
              );
            }
          }
          break;
        }

        case "modifier": {
          for (const li of lineItems) {
            const mods = li.modifiers || [];
            if (rule.rule_code === "MOD-005") {
              if (mods.includes("TC") && mods.includes("26")) {
                addFinding(rule,
                  `${li.procedure_code}: TC and 26 modifiers on same line`,
                  { procedure_code: li.procedure_code, line_item_id: li.id }
                );
              }
            }
            if (rule.rule_code === "MOD-004" && mods.includes("59")) {
              addFinding(rule,
                `${li.procedure_code}: Modifier 59 used - ensure distinct service documentation`,
                { procedure_code: li.procedure_code, line_item_id: li.id }
              );
            }
          }
          break;
        }

        case "payer_specific": {
          if (rule.rule_code === "PAY-004" && claim.timely_filing_deadline) {
            const deadline = new Date(claim.timely_filing_deadline);
            const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
            if (daysLeft <= 14 && daysLeft > 0) {
              const corrected = rule.auto_correct;
              addFinding(rule,
                `Timely filing deadline in ${daysLeft} days (${claim.timely_filing_deadline})`,
                { days_remaining: daysLeft, deadline: claim.timely_filing_deadline },
                corrected, corrected ? "Flagged as urgent priority" : ""
              );
            }
          }
          if (rule.rule_code === "PAY-005") {
            // Duplicate claim check
            const { data: dupes } = await supabase
              .from("claims")
              .select("id, claim_number")
              .eq("patient_id", claim.patient_id)
              .eq("service_date", claim.service_date)
              .neq("id", claim_id)
              .neq("claim_status", "void");
            if (dupes && dupes.length > 0) {
              addFinding(rule,
                `Potential duplicate: ${dupes.length} other claim(s) for same patient and service date`,
                { duplicate_claims: dupes.map((d: any) => d.claim_number) }
              );
            }
          }
          break;
        }

        case "charge_validation": {
          if (rule.rule_code === "CHG-003" && claim.claim_type === "institutional") {
            for (const li of lineItems) {
              if (!li.revenue_code) {
                const corrected = rule.auto_correct;
                addFinding(rule,
                  `Line item ${li.procedure_code}: missing revenue code on institutional claim`,
                  { procedure_code: li.procedure_code, line_item_id: li.id },
                  corrected, corrected ? "Revenue code auto-mapped" : ""
                );
              }
            }
          }
          break;
        }

        case "compliance": {
          if (rule.rule_code === "CMP-001") {
            for (const dx of diagnoses) {
              const code = (dx as any).code || "";
              if (code && !/^[A-Z]\d{2}(\.\d{1,4})?$/.test(code)) {
                addFinding(rule,
                  `Invalid ICD-10 format: ${code}`,
                  { code, expected_format: "A00-Z99.xxxx" }
                );
              }
            }
          }
          break;
        }

        default:
          break;
      }
    }

    // ========== AI CLINICAL VALIDATION ==========
    const aiRules = (rules || []).filter((r: any) => r.rule_type === "ai_clinical");
    if (aiRules.length > 0 && diagnoses.length > 0 && lineItems.length > 0) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        try {
          const dxList = diagnoses.map((d: any) => `${d.code}: ${d.description || "N/A"}`).join("\n");
          const pxList = lineItems.map((li: any) =>
            `${li.procedure_code} (${li.procedure_description || "N/A"}) x${li.units} - $${li.charge_amount}`
          ).join("\n");

          const prompt = `You are a certified medical coder and compliance auditor. Analyze this claim for clinical validity issues.

CLAIM DATA:
- Claim Type: ${claim.claim_type}
- Service Date: ${claim.service_date}
- Total Charges: $${claim.total_charge_amount}
- Patient Gender: ${patient?.gender || "unknown"}
- Patient DOB: ${patient?.dob || "unknown"}
- Payer Type: ${payer?.payer_type || "unknown"}

DIAGNOSES:
${dxList}

PROCEDURES:
${pxList}

Analyze for:
1. Diagnosis-procedure alignment (do diagnoses support the procedures?)
2. Potential upcoding risk (is the code level appropriate?)
3. Missing secondary diagnoses that could improve specificity
4. E/M level appropriateness if applicable

Return findings using the suggest_findings tool.`;

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "You are a medical coding compliance AI. Return structured findings only." },
                { role: "user", content: prompt },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "suggest_findings",
                  description: "Return clinical validation findings",
                  parameters: {
                    type: "object",
                    properties: {
                      findings: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            check_type: { type: "string", enum: ["dx_px_alignment", "upcoding_risk", "missing_secondary_dx", "em_level_support"] },
                            severity: { type: "string", enum: ["error", "warning", "info"] },
                            message: { type: "string" },
                            details: { type: "string" },
                          },
                          required: ["check_type", "severity", "message"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["findings"],
                    additionalProperties: false,
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "suggest_findings" } },
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCall?.function?.arguments) {
              const parsed = JSON.parse(toolCall.function.arguments);
              const aiFindings = parsed.findings || [];

              const checkToRule: Record<string, string> = {
                dx_px_alignment: "AI-001",
                upcoding_risk: "AI-002",
                missing_secondary_dx: "AI-003",
                em_level_support: "AI-004",
              };

              for (const af of aiFindings) {
                const ruleCode = checkToRule[af.check_type];
                const matchedRule = aiRules.find((r: any) => r.rule_code === ruleCode);
                if (matchedRule) {
                  findings.push({
                    claim_id,
                    rule_id: matchedRule.id,
                    rule_code: matchedRule.rule_code,
                    rule_name: matchedRule.rule_name,
                    severity: af.severity || matchedRule.severity,
                    message: af.message,
                    details: { ai_generated: true, ai_details: af.details || "" },
                    auto_corrected: false,
                    correction_applied: null,
                  });
                }
              }
            }
          }
        } catch (aiErr) {
          console.error("AI clinical validation error (non-fatal):", aiErr);
        }
      }
    }

    // 4. Insert all findings
    if (findings.length > 0) {
      const { error: insertErr } = await supabase.from("scrub_results").insert(findings);
      if (insertErr) throw new Error(`Failed to insert findings: ${insertErr.message}`);
    }

    // 5. Update claim scrub status
    const hasErrors = findings.some((f) => f.severity === "error");
    const scrubStatus = findings.length === 0 ? "passed" : hasErrors ? "failed" : "warnings";
    const updateData: any = {
      scrub_status: scrubStatus,
      updated_at: new Date().toISOString(),
    };
    if (scrubStatus === "passed") {
      updateData.scrub_passed_at = new Date().toISOString();
    }
    await supabase.from("claims").update(updateData).eq("id", claim_id);

    return new Response(
      JSON.stringify({
        claim_id,
        scrub_status: scrubStatus,
        total_findings: findings.length,
        errors: findings.filter((f) => f.severity === "error").length,
        warnings: findings.filter((f) => f.severity === "warning").length,
        info: findings.filter((f) => f.severity === "info").length,
        auto_corrected: findings.filter((f) => f.auto_corrected).length,
        findings: findings.map((f) => ({
          rule_code: f.rule_code,
          severity: f.severity,
          message: f.message,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Scrub error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
