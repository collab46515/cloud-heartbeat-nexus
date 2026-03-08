import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRTAConfig() {
  return useQuery({
    queryKey: ["rta-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payer_rta_config")
        .select("*, payers(name, payer_type)")
        .order("payer_id");
      if (error) throw error;
      return data;
    },
  });
}

export function useRTATransactions(claimId?: string) {
  return useQuery({
    queryKey: ["rta-transactions", claimId],
    queryFn: async () => {
      let query = supabase
        .from("rta_transactions")
        .select("*, payers(name), claims(claim_number, patients(first_name, last_name))")
        .order("created_at", { ascending: false })
        .limit(50);

      if (claimId) {
        query = query.eq("claim_id", claimId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useSubmitRTA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (claimId: string) => {
      // Fetch claim and payer RTA config
      const { data: claim, error: claimErr } = await supabase
        .from("claims")
        .select("*, payers(name), patients(first_name, last_name, dob, gender, insurance), providers(npi, first_name, last_name), claim_line_items(*)")
        .eq("id", claimId)
        .single();
      if (claimErr || !claim) throw new Error("Claim not found");

      const { data: rtaConfig } = await supabase
        .from("payer_rta_config")
        .select("*")
        .eq("payer_id", claim.payer_id)
        .eq("rta_enabled", true)
        .maybeSingle();

      if (!rtaConfig) throw new Error("Payer does not support Real-Time Adjudication");

      // Simulate RTA response (in production, this would call the payer API)
      const startTime = Date.now();
      const totalCharge = Number(claim.total_charge_amount);
      const allowedPercent = 0.85 + Math.random() * 0.1;
      const totalAllowed = Math.round(totalCharge * allowedPercent * 100) / 100;
      const adjustment = Math.round((totalCharge - totalAllowed) * 100) / 100;
      const copay = 25;
      const coinsurance = Math.round(totalAllowed * 0.2 * 100) / 100;
      const deductible = 0;
      const patientResp = copay + coinsurance + deductible;
      const planPays = Math.round((totalAllowed - patientResp) * 100) / 100;
      const responseTimeMs = Date.now() - startTime + Math.floor(Math.random() * 800) + 400;

      const isApproved = Math.random() > 0.15; // 85% approval rate

      const rtaResult = {
        claim_id: claimId,
        payer_id: claim.payer_id,
        transaction_id: `RTA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        adjudication_id: isApproved ? `ADJ-${Date.now()}` : null,
        response_status: isApproved ? "approved" : "pended",
        total_allowed: isApproved ? totalAllowed : 0,
        total_adjustment: isApproved ? adjustment : 0,
        copay: isApproved ? copay : 0,
        coinsurance: isApproved ? coinsurance : 0,
        deductible_applied: deductible,
        patient_responsibility: isApproved ? patientResp : 0,
        plan_pays: isApproved ? planPays : 0,
        payment_method: isApproved ? "ACH" : null,
        estimated_payment_date: isApproved ? new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0] : null,
        payment_confirmation: isApproved ? `ACH-${Math.random().toString(36).slice(2, 12).toUpperCase()}` : null,
        response_time_ms: responseTimeMs,
        error_message: isApproved ? null : "Requires additional clinical documentation review",
        request_payload: { claim_number: claim.claim_number, total_charge: totalCharge },
        response_payload: { status: isApproved ? "APPROVED" : "PENDED", determination: isApproved ? "PAYABLE" : "REVIEW_REQUIRED" },
      };

      const { data: txn, error: txnErr } = await supabase
        .from("rta_transactions")
        .insert(rtaResult)
        .select()
        .single();
      if (txnErr) throw txnErr;

      // Update claim
      if (isApproved) {
        await supabase
          .from("claims")
          .update({
            rta_status: "approved",
            rta_eligible: true,
            total_paid_amount: planPays,
            patient_responsibility: patientResp,
            claim_status: "paid" as any,
          })
          .eq("id", claimId);
      } else {
        await supabase
          .from("claims")
          .update({ rta_status: "pended", rta_eligible: true })
          .eq("id", claimId);
      }

      // Audit log
      await supabase.from("claim_audit_log").insert({
        claim_id: claimId,
        action: `RTA ${isApproved ? "approved" : "pended"} - ${rtaResult.transaction_id}`,
        action_category: "rta_submission",
        new_value: { response_status: rtaResult.response_status, plan_pays: rtaResult.plan_pays, response_time_ms: responseTimeMs },
      });

      return txn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      queryClient.invalidateQueries({ queryKey: ["rta-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["claim-stats"] });
    },
  });
}
