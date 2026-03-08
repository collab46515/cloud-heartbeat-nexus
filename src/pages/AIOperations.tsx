import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAIOperations, useAIFeedbackStats } from "@/hooks/useAIOperations";
import { Activity, Zap, DollarSign, AlertTriangle, CheckCircle, XCircle, Clock, Brain, ThumbsUp } from "lucide-react";
import { format } from "date-fns";

function StatusBadge({ rate }: { rate: number }) {
  if (rate >= 99) return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200">Healthy</Badge>;
  if (rate >= 95) return <Badge className="bg-amber-500/15 text-amber-600 border-amber-200">Degraded</Badge>;
  return <Badge variant="destructive">Critical</Badge>;
}

export default function AIOperations() {
  const { data: ops, isLoading } = useAIOperations();
  const { data: feedback } = useAIFeedbackStats();

  return (
    <PageWrapper title="AI Operations Center" description="Monitor, diagnose, and optimize all AI capabilities in real-time">
      {/* Top KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total AI Calls</p>
                <p className="text-2xl font-bold text-foreground">{ops?.totalCalls?.toLocaleString() || "0"}</p>
              </div>
              <Activity className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-foreground">{(ops?.overallSuccessRate || 100).toFixed(1)}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Avg Latency</p>
                <p className="text-2xl font-bold text-foreground">{ops?.avgLatency || 0}ms</p>
              </div>
              <Zap className="h-8 w-8 text-amber-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Est. Cost</p>
                <p className="text-2xl font-bold text-foreground">${(ops?.totalCost || 0).toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">User Satisfaction</p>
                <p className="text-2xl font-bold text-foreground">{(feedback?.positiveRate || 0).toFixed(0)}%</p>
              </div>
              <ThumbsUp className="h-8 w-8 text-emerald-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Capability Health Grid */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> AI Capability Health</CardTitle>
          <CardDescription>Real-time status of all 10 AI edge functions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading metrics...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Capability</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Calls</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Success %</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Avg Latency</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Errors</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Est. Cost</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Last Call</th>
                  </tr>
                </thead>
                <tbody>
                  {ops?.capabilities.map((cap) => (
                    <tr key={cap.capability} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-foreground">{cap.label}</p>
                          <p className="text-xs text-muted-foreground">{cap.edgeFunction}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2"><StatusBadge rate={cap.successRate} /></td>
                      <td className="py-3 px-2 text-right font-mono text-foreground">{cap.totalCalls.toLocaleString()}</td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={cap.successRate} className="w-16 h-1.5" />
                          <span className="font-mono text-foreground">{cap.successRate.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-foreground">{cap.avgLatency}ms</td>
                      <td className="py-3 px-2 text-right">
                        {cap.errorCount > 0 ? (
                          <span className="text-destructive font-mono">{cap.errorCount}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-foreground">${cap.estimatedCost.toFixed(3)}</td>
                      <td className="py-3 px-2 text-right text-xs text-muted-foreground">
                        {cap.lastCallAt ? format(new Date(cap.lastCallAt), "MMM d, HH:mm") : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Recent Errors</CardTitle>
            <CardDescription>Last 10 AI function errors</CardDescription>
          </CardHeader>
          <CardContent>
            {(ops?.recentErrors?.length || 0) === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-500/50 mb-2" />
                <p className="text-sm text-muted-foreground">No errors detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ops?.recentErrors.map((err, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-[10px]">{err.capability}</Badge>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(err.created_at), "MMM d, HH:mm:ss")}</span>
                      </div>
                      <p className="text-xs text-foreground truncate">{err.error_message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ThumbsUp className="h-5 w-5 text-primary" /> AI Feedback Summary</CardTitle>
            <CardDescription>User satisfaction and prediction accuracy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{feedback?.totalFeedback || 0}</p>
                <p className="text-xs text-muted-foreground">Total Feedback</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                <p className="text-2xl font-bold text-emerald-600">{(feedback?.positiveRate || 0).toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Positive Rate</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary/10">
                <p className="text-2xl font-bold text-primary">{(feedback?.accuracyRate || 0).toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Accuracy Rate</p>
              </div>
            </div>
            <div className="space-y-2">
              {feedback && Object.entries(feedback.byCapability).map(([key, stats]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600">+{stats.positive}</span>
                    <span className="text-destructive">-{stats.negative}</span>
                    <span className="text-muted-foreground">({stats.total})</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
