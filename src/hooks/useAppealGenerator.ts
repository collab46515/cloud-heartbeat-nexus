import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface AppealResult {
  appeal_letter: string;
  success_likelihood: number;
  strategy_summary: string;
  key_arguments: string[];
  supporting_documents_needed: string[];
  recommended_appeal_level?: string;
  citations?: string[];
}

export function useAppealGenerator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AppealResult | null>(null);
  const queryClient = useQueryClient();

  const generate = async (denialId: string) => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-appeal-generator", {
        body: { denial_id: denialId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as AppealResult);
      queryClient.invalidateQueries({ queryKey: ["denial-workflows"] });
      return data as AppealResult;
    } catch (e: any) {
      toast.error(e.message || "Failed to generate appeal");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { generate, result, loading };
}
