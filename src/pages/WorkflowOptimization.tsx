import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, ListChecks, AlertTriangle, Lightbulb, Users, Clock, DollarSign, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkflowOptimization, type OptimizedWorklist } from "@/hooks/useWorkflowOptimization";

const urgencyColor: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground",
};

const taskTypeIcon: Record<string, string> = {
  denial_appeal: "🔄",
  scrub_fix: "🔧",
  claim_review: "📋",
  payer_followup: "📞",
  coding_correction: "💻",
  timely_filing_urgent: "⏰",
  payment_posting: "💰",
};

const categoryColor: Record<string, string> = {
  bottleneck: "bg-destructive/15 text-destructive border-destructive/30",
  opportunity: "bg-success/15 text-success border-success/30",
  risk: "bg-warning/15 text-warning border-warning/30",
  efficiency: "bg-info/15 text-info border-info/30",
};

const workloadColor: Record<string, string> = {
  light: "bg-success/15 text-success border-success/30",
  normal: "bg-info/15 text-info border-info/30",
  heavy: "bg-warning/15 text-warning border-warning/30",
  overloaded: "bg-destructive text-destructive-foreground",
};

const fmt = (n: number) => `$${n.toLocaleString("en", { maximumFractionDigits: 0 })}`;

export default function WorkflowOptimizationPage() {
  const { optimize, worklist, loading, latency } = useWorkflowOptimization();

  return (
    <div className="page-animate-in space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">AI Workflow Optimization</h1>
          <p className="text-sm text-muted-foreground">AI-prioritized task lists, workload insights, and staffing recommendations.</p>
        </div>
        <Button onClick={() => optimize()} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {loading ? "Optimizing…" : "Optimize Worklist"}
        </Button>
      </div>

      {!worklist && !loading && (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <ListChecks className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Click "Optimize Worklist" to generate your AI-prioritized task list</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Analyzes pending claims, denials, scrub findings, and timely filing deadlines</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Analyzing workload and optimizing priorities…</p>
          </CardContent>
        </Card>
      )}

      {worklist && <WorklistResults worklist={worklist} latency={latency} />}
    </div>
  );
}

function WorklistResults({ worklist, latency }: { worklist: OptimizedWorklist; latency: number | null }) {
  const ds = worklist.daily_summary;
  const sr = worklist.staffing_recommendation;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Tasks</p>
            <p className="mt-1 text-2xl font-bold">{ds.total_tasks}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Critical</p>
            <p className="mt-1 text-2xl font-bold text-destructive">{ds.critical_tasks}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Revenue at Risk</p>
            <p className="mt-1 text-2xl font-bold text-destructive">{fmt(ds.total_revenue_at_risk)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Recoverable</p>
            <p className="mt-1 text-2xl font-bold text-success">{ds.estimated_recoverable ? fmt(ds.estimated_recoverable) : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Est. Time</p>
            <p className="mt-1 text-2xl font-bold">{ds.estimated_total_time_hours ? `${ds.estimated_total_time_hours}h` : "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Staffing & Top Action */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staffing Assessment</span>
              <Badge variant="outline" className={cn("text-[10px] font-bold uppercase border ml-auto", workloadColor[sr.workload_level])}>{sr.workload_level}</Badge>
            </div>
            <p className="text-sm text-foreground">{sr.recommendation}</p>
            {sr.focus_areas && sr.focus_areas.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {sr.focus_areas.map((area, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">{area}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Priority</span>
            </div>
            <p className="text-sm font-medium text-foreground">{ds.top_priority_action}</p>
            {latency && <p className="text-[10px] text-muted-foreground mt-2">AI analysis: {latency}ms</p>}
          </CardContent>
        </Card>
      </div>

      {/* Prioritized Task List */}
      <Card className="border-border/60">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><ListChecks className="h-4 w-4" /> AI-Prioritized Task List</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {worklist.prioritized_tasks.map((task, i) => (
            <div key={i} className="rounded-md border p-3 flex items-start gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-xs font-bold shrink-0">
                {task.priority_rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-sm">{taskTypeIcon[task.task_type] || "📋"}</span>
                  <span className="text-sm font-semibold text-foreground">{task.action}</span>
                  <Badge variant="outline" className={cn("text-[10px] border", urgencyColor[task.urgency])}>{task.urgency}</Badge>
                  {task.claim_number && <span className="text-[10px] font-mono text-muted-foreground">{task.claim_number}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{task.reason}</p>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                  {task.revenue_at_stake && (
                    <span className="flex items-center gap-0.5"><DollarSign className="h-2.5 w-2.5" />{fmt(task.revenue_at_stake)}</span>
                  )}
                  {task.success_probability !== undefined && (
                    <span className="flex items-center gap-0.5"><Zap className="h-2.5 w-2.5" />{Math.round(task.success_probability * 100)}% success</span>
                  )}
                  {task.estimated_time_minutes && (
                    <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{task.estimated_time_minutes} min</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Workflow Insights */}
      {worklist.workflow_insights?.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Workflow Insights</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {worklist.workflow_insights.map((wi, i) => (
              <div key={i} className="rounded-md border p-3 flex items-start gap-3">
                <Badge variant="outline" className={cn("text-[10px] border shrink-0 mt-0.5", categoryColor[wi.category])}>{wi.category}</Badge>
                <div>
                  <p className="text-sm text-foreground">{wi.insight}</p>
                  {wi.impact && <p className="text-xs text-muted-foreground mt-0.5">{wi.impact}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
