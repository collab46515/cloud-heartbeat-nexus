import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PaymentIntelligence {
  patient_id: string;
  outstanding_balance: number;
  payment_likelihood_30_days: number;
  payment_likelihood_60_days?: number;
  payment_likelihood_90_days: number;
  risk_category: "low_risk" | "medium_risk" | "high_risk" | "very_high_risk";
  recommended_strategy: string;
  optimal_plan: {
    months: number;
    monthly_amount: number;
    interest_rate?: number;
    autopay_recommended: boolean;
    expected_completion_rate?: number;
  };
  communication: {
    preferred_channel: string;
    message_tone: string;
    best_contact_time?: string;
    personalized_message: string;
  };
  insights: Array<{ insight: string; impact: "positive" | "negative" | "neutral" }>;
}

export function usePaymentIntelligence() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaymentIntelligence | null>(null);

  const analyze = async (patientId: string) => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-payment-intelligence", {
        body: { patient_id: patientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as PaymentIntelligence);
      return data as PaymentIntelligence;
    } catch (e: any) {
      toast.error(e.message || "Failed to analyze payment intelligence");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { analyze, result, loading };
}
