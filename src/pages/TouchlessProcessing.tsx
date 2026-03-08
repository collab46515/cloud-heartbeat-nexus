import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Zap, CheckCircle, XCircle, Clock, Loader2, TrendingUp, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";

function useSTPMetrics() {
  return useQuery({
    queryKey: ["stp-metrics"],
    queryFn: async () => {
      const { data: runs } = await supabase.from("stp_pipeline_runs").select("*").order("created_at", { ascending: false }).limit(500);
      const { data: claims } = await supabase.from("claims").select("id, claim_status, scrub_status, claim_number, total_charge_amount").limit(200);

      const total = (runs || []).length;
      const touchless = (runs || []).filter(r => r.is_touchless && r.status === "completed").length;
      const manual = (runs || []).filter(r => !r.is_touchless || r.status === "manual_review").length;
      const failed = (runs || []).filter(r => r.status === "failed").length;
      const stpRate = total > 0 ? (touchless / total) * 100 : 0;
      const avgTime = (runs || []).filter(r => r.processing_time_ms).reduce((s, r) => s + (r.processing_time_ms || 0), 0) / (total || 1);

      // Stage breakdown
      const stageMap: Record<string, { total: number; touchless: number }> = {};
      (runs || []).forEach(r => {
        if (!stageMap[r.pipeline_stage]) stageMap[r.pipeline_stage] = { total: 0, touchless: 0 };
        stageMap[r.pipeline_stage].total++;
        if (r.is_touchless && r.status === "completed") stageMap[r.pipeline_stage].touchless++;
      });
      const stageBreakdown = Object.entries(stageMap).map(([stage, d]) => ({
        stage, total: d.total, touchless: d.touchless, rate: d.total > 0 ? Math.round((d.touchless / d.total) * 100) : 0
      }));

      // Claims needing attention (not auto-processed)
      const manualClaims = (claims || []).filter(c => c.claim_status === "scrubbing" || c.scrub_status === "failed").slice(0, 20);

      const pieData = [
        { name: "Touchless", value: touchless },
        { name: "Manual Review", value: manual },
        { name: "Failed", value: failed },
      ].filter(d => d.value > 0);

      return { total, touchless, manual, failed, stpRate, avgTime, stageBreakdown, pieData, manualClaims, runs: runs || [] };
    },
  });
}

const COLORS = ["hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))"];

const stages = ["intake", "coding", "scrubbing", "submission", "adjudication", "posting"];

export default function TouchlessProcessing() {
  const { data, isLoading } = useSTPMetrics();

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Touchless Processing (STP)</h1>
        <p className="text-sm text-muted-foreground">Straight-Through Processing pipeline — targeting 80%+ touchless claim processing.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pipeline Runs</p><p className="mt-1 text-2xl font-bold">{data?.total || 0}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-success">Touchless</p><p className="mt-1 text-2xl font-bold text-success">{data?.touchless || 0}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-warning">Manual Review</p><p className="mt-1 text-2xl font-bold text-warning">{data?.manual || 0}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-destructive">Failed</p><p className="mt-1 text-2xl font-bold text-destructive">{data?.failed || 0}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">STP Rate</p><p className={cn("mt-1 text-2xl font-bold", (data?.stpRate || 0) >= 80 ? "text-success" : (data?.stpRate || 0) >= 50 ? "text-warning" : "text-destructive")}>{(data?.stpRate || 0).toFixed(1)}%</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avg Time</p><p className="mt-1 text-2xl font-bold">{((data?.avgTime || 0) / 1000).toFixed(1)}s</p></CardContent></Card>
      </div>

      {/* STP Pipeline Visual */}
      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4" /> Pipeline Stages</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-1">
            {stages.map((stage, i) => {
              const stageData = data?.stageBreakdown.find(s => s.stage === stage);
              const rate = stageData?.rate || 0;
              return (
                <div key={stage} className="flex-1">
                  <div className={cn("rounded-lg border p-3 text-center", rate >= 80 ? "border-success/30 bg-success/5" : rate >= 50 ? "border-warning/30 bg-warning/5" : "border-border bg-muted/30")}>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground capitalize">{stage}</p>
                    <p className={cn("text-lg font-bold", rate >= 80 ? "text-success" : rate >= 50 ? "text-warning" : "text-muted-foreground")}>{rate}%</p>
                    <p className="text-[10px] text-muted-foreground">{stageData?.touchless || 0}/{stageData?.total || 0}</p>
                  </div>
                  {i < stages.length - 1 && <div className="flex justify-center py-1"><span className="text-muted-foreground">→</span></div>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* STP Breakdown */}
        <Card className="border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4" /> Processing Breakdown</CardTitle></CardHeader>
          <CardContent>
            {(data?.pieData?.length || 0) > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data?.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {data?.pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="py-12 text-center text-sm text-muted-foreground">No pipeline data yet. Claims will be auto-processed as they flow through the system.</p>}
          </CardContent>
        </Card>

        {/* Stage Performance */}
        <Card className="border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Stage STP Rates</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.stageBreakdown || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="stage" className="text-[10px] fill-muted-foreground capitalize" />
                <YAxis className="text-xs fill-muted-foreground" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="STP Rate" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Pipeline Runs */}
      {(data?.runs?.length || 0) > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead>Stage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Touchless</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Failure Reason</TableHead>
              <TableHead>Date</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.runs.slice(0, 20).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm capitalize">{r.pipeline_stage}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px]", r.status === "completed" ? "text-success border-success/30" : r.status === "failed" ? "text-destructive border-destructive/30" : "text-warning border-warning/30")}>{r.status}</Badge></TableCell>
                  <TableCell>{r.is_touchless ? <CheckCircle className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-warning" />}</TableCell>
                  <TableCell className="text-sm">{r.processing_time_ms ? `${(r.processing_time_ms / 1000).toFixed(1)}s` : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.failure_reason || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
