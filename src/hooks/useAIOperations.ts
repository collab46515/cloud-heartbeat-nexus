import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AICapabilityMetrics {
  capability: string;
  label: string;
  edgeFunction: string;
  totalCalls: number;
  successRate: number;
  avgLatency: number;
  errorCount: number;
  estimatedCost: number;
  lastCallAt: string | null;
}

export interface AIOperationsData {
  capabilities: AICapabilityMetrics[];
  totalCalls: number;
  overallSuccessRate: number;
  totalCost: number;
  avgLatency: number;
  recentErrors: Array<{
    capability: string;
    error_message: string;
    created_at: string;
  }>;
}

const AI_CAPABILITIES = [
  { capability: "denial_prediction", label: "Denial Prediction", edgeFunction: "ai-denial-prediction" },
  { capability: "coding_suggestions", label: "Clinical Coding", edgeFunction: "ai-coding-suggestions" },
  { capability: "payment_intelligence", label: "Payment Intelligence", edgeFunction: "ai-payment-intelligence" },
  { capability: "appeal_generator", label: "Appeal Generator", edgeFunction: "ai-appeal-generator" },
  { capability: "rta_prediction", label: "RTA Prediction", edgeFunction: "ai-rta-prediction" },
  { capability: "anomaly_detection", label: "Anomaly Detection", edgeFunction: "ai-anomaly-detection" },
  { capability: "revenue_forecast", label: "Revenue Forecast", edgeFunction: "ai-revenue-forecast" },
  { capability: "workflow_optimization", label: "Workflow AI", edgeFunction: "ai-workflow-optimization" },
  { capability: "rcm_copilot", label: "RCM Copilot", edgeFunction: "ai-rcm-copilot" },
  { capability: "scrub_claim", label: "Claim Scrubbing", edgeFunction: "scrub-claim" },
];

export function useAIOperations() {
  return useQuery({
    queryKey: ["ai-operations"],
    queryFn: async (): Promise<AIOperationsData> => {
      const { data: logs, error } = await supabase
        .from("ai_usage_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      const allLogs = logs || [];

      const capabilities: AICapabilityMetrics[] = AI_CAPABILITIES.map((cap) => {
        const capLogs = allLogs.filter((l: any) => l.capability === cap.capability);
        const successLogs = capLogs.filter((l: any) => l.status === "success");
        const latencies = capLogs.filter((l: any) => l.latency_ms).map((l: any) => l.latency_ms);

        return {
          capability: cap.capability,
          label: cap.label,
          edgeFunction: cap.edgeFunction,
          totalCalls: capLogs.length,
          successRate: capLogs.length > 0 ? (successLogs.length / capLogs.length) * 100 : 100,
          avgLatency: latencies.length > 0 ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length) : 0,
          errorCount: capLogs.filter((l: any) => l.status === "error").length,
          estimatedCost: capLogs.reduce((s: number, l: any) => s + Number(l.estimated_cost || 0), 0),
          lastCallAt: capLogs.length > 0 ? capLogs[0].created_at : null,
        };
      });

      const totalCalls = allLogs.length;
      const successCount = allLogs.filter((l: any) => l.status === "success").length;
      const allLatencies = allLogs.filter((l: any) => l.latency_ms).map((l: any) => l.latency_ms);

      const recentErrors = allLogs
        .filter((l: any) => l.status === "error" && l.error_message)
        .slice(0, 10)
        .map((l: any) => ({
          capability: l.capability,
          error_message: l.error_message,
          created_at: l.created_at,
        }));

      return {
        capabilities,
        totalCalls,
        overallSuccessRate: totalCalls > 0 ? (successCount / totalCalls) * 100 : 100,
        totalCost: allLogs.reduce((s: number, l: any) => s + Number(l.estimated_cost || 0), 0),
        avgLatency: allLatencies.length > 0 ? Math.round(allLatencies.reduce((a: number, b: number) => a + b, 0) / allLatencies.length) : 0,
        recentErrors,
      };
    },
    refetchInterval: 30000,
  });
}

export function useAIFeedbackStats() {
  return useQuery({
    queryKey: ["ai-feedback-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const allFeedback = data || [];

      const byCapability: Record<string, { positive: number; negative: number; correct: number; total: number }> = {};

      AI_CAPABILITIES.forEach((cap) => {
        const capFeedback = allFeedback.filter((f: any) => f.ai_capability === cap.capability);
        byCapability[cap.capability] = {
          positive: capFeedback.filter((f: any) => f.rating === "positive").length,
          negative: capFeedback.filter((f: any) => f.rating === "negative").length,
          correct: capFeedback.filter((f: any) => f.prediction_was_correct === true).length,
          total: capFeedback.length,
        };
      });

      return {
        totalFeedback: allFeedback.length,
        positiveRate: allFeedback.length > 0
          ? (allFeedback.filter((f: any) => f.rating === "positive").length / allFeedback.length) * 100
          : 0,
        accuracyRate: (() => {
          const withOutcome = allFeedback.filter((f: any) => f.prediction_was_correct !== null);
          return withOutcome.length > 0
            ? (withOutcome.filter((f: any) => f.prediction_was_correct).length / withOutcome.length) * 100
            : 0;
        })(),
        byCapability,
      };
    },
    refetchInterval: 60000,
  });
}
