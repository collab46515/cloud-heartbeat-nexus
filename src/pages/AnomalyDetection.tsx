import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAnomalyDetection, type Anomaly, type AnomalyReport } from "@/hooks/useAnomalyDetection";
import { formatCurrency } from "@/data/mock-claims";
import { cn } from "@/lib/utils";
import { ShieldAlert, Loader2, Brain, AlertTriangle, CheckCircle, Eye, RefreshCw, TrendingUp } from "lucide-react";

const severityColors: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground",
};

const categoryIcons: Record<string, string> = {
  coding: "📋",
  provider: "👨‍⚕️",
  payment: "💰",
  payer: "🏢",
  compliance: "⚖️",
};

export default function AnomalyDetection() {
  const { runScan, report, loading } = useAnomalyDetection();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const criticalCount = report?.anomalies?.filter(a => a.severity === "critical").length || 0;
  const highCount = report?.anomalies?.filter(a => a.severity === "high").length || 0;
  const totalImpact = report?.anomalies?.reduce((s, a) => s + (a.estimated_financial_impact || 0), 0) || 0;

  return (
    <div className="page-animate-in space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Anomaly Detection & Fraud Prevention</h1>
          <p className="text-sm text-muted-foreground">AI-powered scanning for coding anomalies, payment irregularities, and compliance risks.</p>
        </div>
        <Button size="sm" onClick={() => runScan("full")} disabled={loading} className="gap-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {loading ? "Scanning…" : "Run AI Scan"}
        </Button>
      </div>

      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Risk Score</p>
              <div className="mt-1 flex items-center gap-2">
                <p className={cn("text-2xl font-bold", report.overall_risk_score > 70 ? "text-destructive" : report.overall_risk_score > 40 ? "text-warning" : "text-success")}>
                  {report.overall_risk_score}
                </p>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
              <Progress value={report.overall_risk_score} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Critical/High</p>
              <p className="mt-1 text-2xl font-bold text-destructive">{criticalCount + highCount}</p>
              <p className="text-[10px] text-muted-foreground">{criticalCount} critical · {highCount} high</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Anomalies</p>
              <p className="mt-1 text-2xl font-bold">{report.anomalies?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Financial Impact</p>
              <p className="mt-1 text-2xl font-bold text-warning">{formatCurrency(totalImpact)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Running AI anomaly detection…</p>
            <p className="text-xs text-muted-foreground">Analyzing claims, payments, coding patterns, and provider behavior.</p>
          </CardContent>
        </Card>
      )}

      {/* No scan yet */}
      {!report && !loading && (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <ShieldAlert className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No Scan Results</p>
            <p className="text-xs text-muted-foreground">Run an AI scan to detect anomalies across your revenue cycle data.</p>
            <Button size="sm" onClick={() => runScan("full")} className="gap-1 mt-2">
              <Brain className="h-3 w-3" /> Start Scan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Report */}
      {report && !loading && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-sm text-foreground">{report.summary}</p>
              {report.scanned_at && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Scanned at {new Date(report.scanned_at).toLocaleString()} · {report.latency_ms}ms
                </p>
              )}
            </CardContent>
          </Card>

          {/* Anomalies */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Detected Anomalies</h2>
            {report.anomalies?.map((anomaly) => (
              <Card
                key={anomaly.id}
                className={cn("border-border/60 cursor-pointer transition-all hover:shadow-md", expandedId === anomaly.id && "ring-1 ring-primary/30")}
                onClick={() => setExpandedId(expandedId === anomaly.id ? null : anomaly.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{categoryIcons[anomaly.category] || "🔍"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn("text-[10px] border", severityColors[anomaly.severity])}>
                          {anomaly.severity}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{anomaly.category}</Badge>
                        <span className="text-sm font-semibold text-foreground">{anomaly.title}</span>
                      </div>
                      {anomaly.affected_entity && (
                        <p className="mt-0.5 text-xs text-muted-foreground">Affected: {anomaly.affected_entity}</p>
                      )}

                      {expandedId === anomaly.id && (
                        <div className="mt-3 space-y-2 border-t pt-3">
                          <p className="text-xs text-foreground">{anomaly.description}</p>
                          {anomaly.metric_value && (
                            <div className="flex gap-4 text-xs">
                              <span className="text-muted-foreground">Observed: <span className="font-bold text-foreground">{anomaly.metric_value}</span></span>
                              {anomaly.expected_range && (
                                <span className="text-muted-foreground">Expected: <span className="font-bold text-foreground">{anomaly.expected_range}</span></span>
                              )}
                            </div>
                          )}
                          <div className="rounded-md border border-dashed p-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recommended Action</p>
                            <p className="text-xs text-foreground">{anomaly.recommended_action}</p>
                          </div>
                          {anomaly.estimated_financial_impact && (
                            <p className="text-xs font-medium text-warning">
                              Estimated impact: {formatCurrency(anomaly.estimated_financial_impact)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <Eye className={cn("h-4 w-4 shrink-0 transition-transform", expandedId === anomaly.id ? "rotate-0 text-primary" : "text-muted-foreground")} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recommendations */}
          {report.recommendations?.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    <span className="text-foreground">{rec}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
