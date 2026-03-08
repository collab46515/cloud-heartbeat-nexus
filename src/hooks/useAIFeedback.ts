import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAIFeedback() {
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = async (params: {
    aiCapability: string;
    predictionId?: string;
    claimId?: string;
    rating: "positive" | "negative";
    outcome?: string;
    feedbackText?: string;
    predictionWasCorrect?: boolean;
  }) => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("ai_feedback" as any).insert({
        user_id: user?.id || null,
        ai_capability: params.aiCapability,
        prediction_id: params.predictionId || null,
        claim_id: params.claimId || null,
        rating: params.rating,
        outcome: params.outcome || null,
        feedback_text: params.feedbackText || null,
        prediction_was_correct: params.predictionWasCorrect ?? null,
      } as any);

      if (error) throw error;
      toast.success("Feedback recorded — helps improve AI accuracy");
    } catch (e: any) {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return { submitFeedback, submitting };
}
