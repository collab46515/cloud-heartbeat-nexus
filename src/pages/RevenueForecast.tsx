import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Brain, Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign, Target, ArrowUpRight, ArrowDownRight, Minus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRevenueForecast, type RevenueForecast } from "@/hooks/useRevenueForecast";

const trendIcon = (trend: string) => {
  if (trend === "improving") return <TrendingUp className="h-3.5 w-3.5 text-success" />;
  if (trend === "declining" || trend === "worsening") return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

const healthColor: Record<string, string> = {
  excellent: "bg-success/15 text-success border-success/30",
  good: "bg-success/10 text-success border-success/20",
  fair: "bg-warning/15 text-warning border-warning/30",
  poor: "bg-destructive/15 text-destructive border-destructive/30",
  critical: "bg-destructive text-destructive-foreground",
};

const effortColor: Record<string, string> = {
  low: "bg-success/15 text-success border-success/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  high: "bg-destructive/15 text-destructive border-destructive/30",
};

const fmt = (n: number) => `$${n.toLocaleString("en", { maximumFractionDigits: 0 })}`;

export default function RevenueForecastPage() {
  const { generateForecast, forecast, loading, latency } = useRevenueForecast();

  return (
    <div className="page-animate-in space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">AI Revenue Forecasting</h1>
          <p className="text-sm text-muted-foreground">Predictive analytics, risk scenarios, and optimization opportunities powered by AI.</p>
        </div>
        <Button onClick={() => generateForecast()} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {loading ? "Analyzing…" : "Generate Forecast"}
        </Button>
      </div>

      {!forecast && !loading && (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <TrendingUp className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Click "Generate Forecast" to analyze your revenue data with AI</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Analyzes claims, payments, denials, and payer trends</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Analyzing revenue data and generating forecast…</p>
          </CardContent>
        </Card>
      )}

      {forecast && <ForecastResults forecast={forecast} latency={latency} />}
    </div>
  );
}

function ForecastResults({ forecast, latency }: { forecast: RevenueForecast; latency: number | null }) {
  const kma = forecast.key_metrics_assessment;

  return (
    <div className="space-y-6">
      {/* Health Overview */}
      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="outline" className={cn("text-xs font-bold uppercase border", healthColor[kma.overall_health])}>
              {kma.overall_health} Health
            </Badge>
            {latency && <span className="text-[10px] text-muted-foreground ml-auto">AI analysis: {latency}ms</span>}
          </div>
          <p className="text-sm text-foreground">{kma.summary}</p>
          <div className="mt-3 flex gap-4">
            <div className="flex items-center gap-1.5 text-xs">
              {trendIcon(kma.collection_rate_trend)}
              <span className="text-muted-foreground">Collections:</span>
              <span className="font-medium capitalize">{kma.collection_rate_trend}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {trendIcon(kma.denial_rate_trend)}
              <span className="text-muted-foreground">Denials:</span>
              <span className="font-medium capitalize">{kma.denial_rate_trend}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {trendIcon(kma.ar_days_trend)}
              <span className="text-muted-foreground">A/R Days:</span>
              <span className="font-medium capitalize">{kma.ar_days_trend}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" /> 30-Day Forecast</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold text-foreground">{fmt(forecast.forecast_30_day.expected_revenue)}</p>
            <p className="text-xs text-muted-foreground">
              Range: {fmt(forecast.forecast_30_day.confidence_low)} – {fmt(forecast.forecast_30_day.confidence_high)}
            </p>
            {forecast.forecast_30_day.expected_denials !== undefined && (
              <p className="text-xs text-destructive">Expected denial losses: {fmt(forecast.forecast_30_day.expected_denials)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4" /> 90-Day Forecast</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold text-foreground">{fmt(forecast.forecast_90_day.expected_revenue)}</p>
            <p className="text-xs text-muted-foreground">
              Range: {fmt(forecast.forecast_90_day.confidence_low)} – {fmt(forecast.forecast_90_day.confidence_high)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Scenarios */}
      {forecast.risk_scenarios?.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Risk Scenarios</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {forecast.risk_scenarios.map((rs, i) => (
              <div key={i} className="rounded-md border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-foreground">{rs.scenario}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{Math.round(rs.probability * 100)}% likely</Badge>
                    <span className={cn("text-xs font-bold", rs.revenue_impact < 0 ? "text-destructive" : "text-success")}>
                      {rs.revenue_impact < 0 ? "" : "+"}{fmt(rs.revenue_impact)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{rs.description}</p>
                {rs.mitigation && <p className="mt-1 text-xs text-primary">↳ Mitigation: {rs.mitigation}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Optimization Opportunities */}
      {forecast.optimization_opportunities?.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4" /> Optimization Opportunities</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {forecast.optimization_opportunities.map((opp, i) => (
              <div key={i} className="rounded-md border p-3 flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">{opp.opportunity}</span>
                    <Badge variant="outline" className={cn("text-[10px] border", effortColor[opp.effort])}>{opp.effort} effort</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{opp.description}</p>
                  {opp.timeframe && <p className="text-[10px] text-muted-foreground mt-1">Timeframe: {opp.timeframe}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-success">+{fmt(opp.potential_revenue)}</p>
                  <p className="text-[10px] text-muted-foreground">potential</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Payer Insights */}
      {forecast.payer_insights && forecast.payer_insights.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Payer Insights</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {forecast.payer_insights.map((pi, i) => (
              <div key={i} className="rounded-md border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-foreground">{pi.payer_name}</span>
                  {pi.revenue_opportunity && <span className="text-xs font-bold text-success">+{fmt(pi.revenue_opportunity)}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{pi.insight}</p>
                <p className="mt-1 text-xs text-primary">↳ {pi.action}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
