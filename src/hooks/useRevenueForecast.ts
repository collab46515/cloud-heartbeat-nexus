import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RevenueForecast {
  forecast_30_day: {
    expected_revenue: number;
    confidence_low: number;
    confidence_high: number;
    expected_collections?: number;
    expected_denials?: number;
  };
  forecast_90_day: {
    expected_revenue: number;
    confidence_low: number;
    confidence_high: number;
  };
  risk_scenarios: Array<{
    scenario: string;
    probability: number;
    revenue_impact: number;
    description: string;
    mitigation?: string;
  }>;
  optimization_opportunities: Array<{
    opportunity: string;
    potential_revenue: number;
    effort: "low" | "medium" | "high";
    timeframe?: string;
    description: string;
  }>;
  payer_insights?: Array<{
    payer_name: string;
    insight: string;
    action: string;
    revenue_opportunity?: number;
  }>;
  key_metrics_assessment: {
    collection_rate_trend: "improving" | "stable" | "declining";
    denial_rate_trend: "improving" | "stable" | "worsening";
    ar_days_trend: "improving" | "stable" | "worsening";
    overall_health: "excellent" | "good" | "fair" | "poor" | "critical";
    summary: string;
  };
}

export function useRevenueForecast() {
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<RevenueForecast | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const generateForecast = async (period = "90_days") => {
    setLoading(true);
    setForecast(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-revenue-forecast", {
        body: { period },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setForecast(data.forecast);
      setLatency(data.latency_ms);
      return data.forecast as RevenueForecast;
    } catch (e: any) {
      toast.error(e.message || "Failed to generate revenue forecast");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { generateForecast, forecast, loading, latency };
}
