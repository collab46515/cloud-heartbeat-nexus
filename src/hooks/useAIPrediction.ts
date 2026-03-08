import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface DenialPrediction {
  denial_probability: number;
  risk_level: "low" | "medium" | "high" | "critical";
  confidence_lower?: number;
  confidence_upper?: number;
  risk_factors: Array<{
    factor: string;
    score: number;
    description: string;
    affected_codes?: string[];
  }>;
  recommended_actions: Array<{
    action: string;
    priority: "high" | "medium" | "low";
    estimated_impact?: string;
  }>;
  revenue_at_risk?: number;
  revenue_protected_if_fixed?: number;
  prediction_id?: string;
  latency_ms?: number;
}

export interface CodingSuggestion {
  suggestion_type: "diagnosis" | "procedure" | "modifier" | "cdi_query" | "e_m_level";
  current_code?: string;
  suggested_code: string;
  suggested_description: string;
  confidence: number;
  evidence: string;
  clinical_section?: string;
  revenue_impact?: number;
}

export interface CodingResult {
  suggestions: CodingSuggestion[];
  overall_assessment: string;
  total_revenue_impact?: number;
  coding_accuracy_score: number;
}

export function useAIPrediction() {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<DenialPrediction | null>(null);
  const queryClient = useQueryClient();

  const predictDenial = async (claimId: string) => {
    setLoading(true);
    setPrediction(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-denial-prediction", {
        body: { claim_id: claimId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPrediction(data.prediction);
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      return data.prediction as DenialPrediction;
    } catch (e: any) {
      toast.error(e.message || "Failed to predict denial risk");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { predictDenial, prediction, loading };
}

export function useCodingSuggestions() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CodingResult | null>(null);

  const getSuggestions = async (claimId: string, clinicalText?: string) => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-coding-suggestions", {
        body: { claim_id: claimId, clinical_text: clinicalText },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as CodingResult);
      return data as CodingResult;
    } catch (e: any) {
      toast.error(e.message || "Failed to get coding suggestions");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { getSuggestions, result, loading };
}
