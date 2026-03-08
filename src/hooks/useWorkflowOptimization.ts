import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OptimizedWorklist {
  prioritized_tasks: Array<{
    priority_rank: number;
    task_type: string;
    claim_number?: string;
    action: string;
    reason: string;
    revenue_at_stake?: number;
    success_probability?: number;
    estimated_time_minutes?: number;
    urgency: "critical" | "high" | "medium" | "low";
  }>;
  daily_summary: {
    total_tasks: number;
    critical_tasks: number;
    total_revenue_at_risk: number;
    estimated_recoverable?: number;
    estimated_total_time_hours?: number;
    top_priority_action: string;
  };
  workflow_insights: Array<{
    insight: string;
    category: "bottleneck" | "opportunity" | "risk" | "efficiency";
    impact?: string;
  }>;
  staffing_recommendation: {
    workload_level: "light" | "normal" | "heavy" | "overloaded";
    recommendation: string;
    focus_areas?: string[];
  };
}

export function useWorkflowOptimization() {
  const [loading, setLoading] = useState(false);
  const [worklist, setWorklist] = useState<OptimizedWorklist | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const optimize = async () => {
    setLoading(true);
    setWorklist(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-workflow-optimization", {
        body: {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setWorklist(data.worklist);
      setLatency(data.latency_ms);
      return data.worklist as OptimizedWorklist;
    } catch (e: any) {
      toast.error(e.message || "Failed to optimize workflow");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { optimize, worklist, loading, latency };
}
