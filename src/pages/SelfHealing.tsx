import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wrench, CheckCircle, XCircle, Loader2, RefreshCw, Cog, Zap, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function useAutomationRules() {
  return useQuery({
    queryKey: ["automation-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("automation_rules").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useAutomationExecutions() {
  return useQuery({
    queryKey: ["automation-executions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("automation_executions").select("*, automation_rules(rule_name, rule_type)").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });
}

function useSeedRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const rules = [
        { rule_name: "Auto-Correct Missing Modifier", rule_type: "auto_correct", trigger_condition: { event: "scrub_error", rule_code: "MOD_MISSING" }, action_config: { action: "add_modifier", modifier: "25" }, is_active: true, success_count: 142, failure_count: 8 },
        { rule_name: "Auto-Resubmit Timeout Claims", rule_type: "auto_resubmit", trigger_condition: { event: "submission_timeout", max_retries: 3 }, action_config: { action: "resubmit", delay_minutes: 30 }, is_active: true, success_count: 67, failure_count: 3 },
        { rule_name: "Auto-Appeal CO-4 Denials", rule_type: "auto_appeal", trigger_condition: { event: "denial", carc_code: "CO-4" }, action_config: { action: "generate_appeal", template: "missing_info" }, is_active: true, success_count: 28, failure_count: 12 },
        { rule_name: "Auto-Post ERA Payments", rule_type: "auto_post", trigger_condition: { event: "era_received", variance_threshold: 5 }, action_config: { action: "auto_post", max_variance_pct: 5 }, is_active: true, success_count: 890, failure_count: 15 },
        { rule_name: "Auto-Correct Diagnosis Pointer", rule_type: "auto_correct", trigger_condition: { event: "scrub_error", rule_code: "DX_PTR" }, action_config: { action: "fix_pointer", sequence: "primary" }, is_active: false, success_count: 55, failure_count: 22 },
        { rule_name: "Auto-Route Timely Filing Alerts", rule_type: "auto_correct", trigger_condition: { event: "timely_filing", days_remaining: 7 }, action_config: { action: "escalate", queue: "urgent_submission" }, is_active: true, success_count: 34, failure_count: 1 },
      ];
      const { error } = await supabase.from("automation_rules").insert(rules);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success("Automation rules configured");
    },
  });
}

function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("automation_rules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-rules"] }),
  });
}

const typeColors: Record<string, string> = {
  auto_correct: "bg-info/15 text-info border-info/30",
  auto_resubmit: "bg-warning/15 text-warning border-warning/30",
  auto_appeal: "bg-primary/15 text-primary border-primary/30",
  auto_post: "bg-success/15 text-success border-success/30",
};

const typeLabels: Record<string, string> = {
  auto_correct: "Auto-Correct",
  auto_resubmit: "Auto-Resubmit",
  auto_appeal: "Auto-Appeal",
  auto_post: "Auto-Post",
};

export default function SelfHealing() {
  const { data: rules = [], isLoading: rulesLoading } = useAutomationRules();
  const { data: executions = [] } = useAutomationExecutions();
  const seedRules = useSeedRules();
  const toggleRule = useToggleRule();

  const activeRules = rules.filter((r: any) => r.is_active).length;
  const totalSuccess = rules.reduce((s: number, r: any) => s + (r.success_count || 0), 0);
  const totalFailure = rules.reduce((s: number, r: any) => s + (r.failure_count || 0), 0);
  const healingRate = totalSuccess + totalFailure > 0 ? (totalSuccess / (totalSuccess + totalFailure)) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Self-Healing Automation</h1>
          <p className="text-sm text-muted-foreground">Autonomous error correction, auto-resubmission, and self-healing workflows.</p>
        </div>
        {rules.length === 0 && (
          <Button onClick={() => seedRules.mutate()} disabled={seedRules.isPending} className="gap-1">
            {seedRules.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cog className="h-4 w-4" />} Initialize Rules
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Rules</p><p className="mt-1 text-2xl font-bold">{rules.length}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-success">Active</p><p className="mt-1 text-2xl font-bold text-success">{activeRules}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Auto-Healed</p><p className="mt-1 text-2xl font-bold">{totalSuccess.toLocaleString()}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-destructive">Failed</p><p className="mt-1 text-2xl font-bold text-destructive">{totalFailure}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Healing Rate</p><p className={cn("mt-1 text-2xl font-bold", healingRate >= 90 ? "text-success" : healingRate >= 70 ? "text-warning" : "text-destructive")}>{healingRate.toFixed(1)}%</p></CardContent></Card>
      </div>

      {rulesLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : rules.length === 0 ? (
        <Card className="border-border/60"><CardContent className="p-8 text-center">
          <Wrench className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No automation rules configured</p>
          <p className="text-xs text-muted-foreground">Click "Initialize Rules" to set up self-healing automation.</p>
        </CardContent></Card>
      ) : (
        <>
          {/* Rules */}
          <Card className="border-border/60">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Cog className="h-4 w-4" /> Automation Rules</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead>Rule</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead className="text-center">Success</TableHead>
                  <TableHead className="text-center">Failed</TableHead>
                  <TableHead className="text-center">Rate</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rules.map((r: any) => {
                    const rate = (r.success_count + r.failure_count) > 0 ? (r.success_count / (r.success_count + r.failure_count) * 100) : 0;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm font-medium">{r.rule_name}</TableCell>
                        <TableCell><Badge variant="outline" className={cn("text-[10px] border", typeColors[r.rule_type])}>{typeLabels[r.rule_type]}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{(r.trigger_condition as any)?.event || "—"}</TableCell>
                        <TableCell className="text-center text-sm text-success">{r.success_count}</TableCell>
                        <TableCell className="text-center text-sm text-destructive">{r.failure_count}</TableCell>
                        <TableCell className="text-center text-sm font-medium">{rate.toFixed(0)}%</TableCell>
                        <TableCell className="text-center"><Switch checked={r.is_active} onCheckedChange={v => toggleRule.mutate({ id: r.id, is_active: v })} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Executions */}
          {executions.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4" /> Recent Executions</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow className="bg-muted/40">
                    <TableHead>Rule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {executions.slice(0, 20).map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{e.automation_rules?.rule_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={cn("text-[10px]", e.status === "success" ? "text-success" : "text-destructive")}>{e.status}</Badge></TableCell>
                        <TableCell className="text-sm">{e.execution_time_ms ? `${e.execution_time_ms}ms` : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{e.error_message || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
