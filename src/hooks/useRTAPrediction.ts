import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RTAPrediction {
  rta_recommended: boolean;
  confidence: number;
  expected_approval_probability: number;
  expected_response_time_ms?: number;
  expected_allowed_amount?: number;
  expected_patient_responsibility?: number;
  expected_plan_pays?: number;
  recommendation_reason: string;
  risk_factors: Array<{
    factor: string;
    impact: "positive" | "negative" | "neutral";
    description: string;
  }>;
  batch_comparison: {
    expected_days_to_payment: number;
    expected_approval_rate: number;
    recommendation?: string;
  };
  latency_ms?: number;
}

export function useRTAPrediction() {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<RTAPrediction | null>(null);

  const predict = async (claimId: string) => {
    setLoading(true);
    setPrediction(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-rta-prediction", {
        body: { claim_id: claimId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPrediction(data.prediction);
      return data.prediction as RTAPrediction;
    } catch (e: any) {
      toast.error(e.message || "Failed to predict RTA outcome");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { predict, prediction, loading };
}
