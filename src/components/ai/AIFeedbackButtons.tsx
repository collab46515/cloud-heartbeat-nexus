import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIFeedback } from "@/hooks/useAIFeedback";

interface AIFeedbackButtonsProps {
  aiCapability: string;
  predictionId?: string;
  claimId?: string;
  className?: string;
}

export function AIFeedbackButtons({ aiCapability, predictionId, claimId, className }: AIFeedbackButtonsProps) {
  const { submitFeedback, submitting } = useAIFeedback();
  const [submitted, setSubmitted] = useState<"positive" | "negative" | null>(null);

  const handle = async (rating: "positive" | "negative") => {
    if (submitted || submitting) return;
    setSubmitted(rating);
    await submitFeedback({ aiCapability, predictionId, claimId, rating });
  };

  if (submitted) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        {submitted === "positive" ? (
          <ThumbsUp className="h-3.5 w-3.5 text-success fill-current" />
        ) : (
          <ThumbsDown className="h-3.5 w-3.5 text-destructive fill-current" />
        )}
        <span>Thanks for the feedback</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <span>Helpful?</span>
      <button
        onClick={() => handle("positive")}
        disabled={submitting}
        className="p-1 rounded hover:bg-accent transition-colors"
        title="Yes, helpful"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => handle("negative")}
        disabled={submitting}
        className="p-1 rounded hover:bg-accent transition-colors"
        title="Not helpful"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
