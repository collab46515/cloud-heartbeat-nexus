import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Anomaly {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  category: "coding" | "provider" | "payment" | "payer" | "compliance";
  title: string;
  description: string;
  affected_entity?: string;
  metric_value?: string;
  expected_range?: string;
  recommended_action: string;
  estimated_financial_impact?: number;
}

export interface AnomalyReport {
  overall_risk_score: number;
  anomalies: Anomaly[];
  summary: string;
  recommendations: string[];
  latency_ms?: number;
  scanned_at?: string;
}

export function useAnomalyDetection() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AnomalyReport | null>(null);

  const runScan = async (scanType: string = "full") => {
    setLoading(true);
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-anomaly-detection", {
        body: { scan_type: scanType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReport(data.report);
      toast.success(`Scan complete: ${data.report.anomalies?.length || 0} anomalies detected`);
      return data.report as AnomalyReport;
    } catch (e: any) {
      toast.error(e.message || "Anomaly scan failed");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { runScan, report, loading };
}
