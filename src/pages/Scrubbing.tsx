import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Brain, CheckCircle, Loader2, Play, Plus, Settings, Shield, Trash2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RuleEditorDialog } from "@/components/scrubbing/RuleEditorDialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  useDeleteScrubRule,
  useResolveScrubResult,
  useRunScrub,
  useSaveScrubRule,
  useScrubResults,
  useScrubRules,
  useScrubStats,
} from "@/hooks/useScrubbing";

const severityColors: Record<string, string> = {
  error: "bg-destructive/15 text-destructive border-destructive/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  info: "bg-info/15 text-info border-info/30",
};

function ScrubStatsCards({ stats }: { stats: any }) {
  const cards = [
    { label: "Total Findings", value: stats?.total ?? 0 },
    { label: "Errors", value: stats?.errors ?? 0, className: "text-destructive" },
    { label: "Warnings", value: stats?.warnings ?? 0, className: "text-warning" },
    { label: "Resolved", value: stats?.resolved ?? 0, className: "text-success" },
    { label: "Auto-Corrected", value: stats?.autoCorrected ?? 0, className: "text-info" },
    { label: "Claims Affected", value: stats?.uniqueClaims ?? 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.label} className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className={cn("mt-1 text-2xl font-bold", c.className)}>{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Scrubbing() {
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  const { data: rules = [], isLoading: loadingRules } = useScrubRules(true);
  const { data: results = [], isLoading: loadingResults } = useScrubResults();
  const { data: stats } = useScrubStats();

  const resolveResult = useResolveScrubResult();
  const runScrub = useRunScrub();
  const saveRule = useSaveScrubRule();
  const deleteRule = useDeleteScrubRule();

  const { data: claims = [] } = useQuery({
    queryKey: ["claims-for-scrub"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("id, claim_number, claim_status, scrub_status, total_charge_amount")
        .order("created_at", { ascending: false })
        .limit(150);
      if (error) throw error;
      return data;
    },
  });

  const rulesByType = useMemo(
    () =>
      rules.reduce((acc: Record<string, any[]>, rule: any) => {
        if (!acc[rule.rule_type]) acc[rule.rule_type] = [];
        acc[rule.rule_type].push(rule);
        return acc;
      }, {}),
    [rules],
  );

  const runSingleScrub = async (claimId: string) => {
    try {
      const result = await runScrub.mutateAsync(claimId);
      toast.success(`Scrub complete: ${result.scrub_status} (${result.total_findings} findings)`);
    } catch (e: any) {
      toast.error(e.message || "Failed to run scrub");
    }
  };

  const handleResolve = async () => {
    if (!selectedResult) return;
    try {
      await resolveResult.mutateAsync({ id: selectedResult.id, resolution_notes: resolutionNotes });
      toast.success("Scrub finding resolved");
      setSelectedResult(null);
      setResolutionNotes("");
    } catch (e: any) {
      toast.error(e.message || "Failed to resolve");
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteRule.mutateAsync(ruleId);
      toast.success("Rule deleted");
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  };

  return (
    <div className="page-animate-in space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Claim Scrubbing Engine</h1>
          <p className="text-sm text-muted-foreground">Governed rule evaluation with JSON logic, real CCI/MUE/NCCI reference checks, AI validation, and auto-correction.</p>
        </div>
        <Button
          className="gap-1"
          onClick={() => {
            setEditingRule(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="h-3 w-3" />
          New Rule
        </Button>
      </div>

      <ScrubStatsCards stats={stats} />

      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedClaimId} onValueChange={setSelectedClaimId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select claim to run scrub..." />
              </SelectTrigger>
              <SelectContent>
                {claims.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.claim_number} — {c.claim_status} / scrub: {c.scrub_status || "pending"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!selectedClaimId || runScrub.isPending} onClick={() => runSingleScrub(selectedClaimId)} className="gap-1">
              {runScrub.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
              Run Scrub
            </Button>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Claim</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scrub</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.slice(0, 10).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.claim_number}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{c.claim_status}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{c.scrub_status || "pending"}</Badge></TableCell>
                    <TableCell>${Number(c.total_charge_amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => runSingleScrub(c.id)} disabled={runScrub.isPending}>
                        Run
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="results" className="w-full">
        <TabsList>
          <TabsTrigger value="results" className="gap-1"><AlertTriangle className="h-3 w-3" /> Scrub Results</TabsTrigger>
          <TabsTrigger value="rules" className="gap-1"><Settings className="h-3 w-3" /> Rule Governance</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4 pt-4">
          {loadingResults ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : results.length === 0 ? (
            <Card className="border-border/60"><CardContent className="p-8 text-center"><p className="text-sm text-muted-foreground">No scrub findings yet.</p></CardContent></Card>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Severity</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r: any) => (
                    <TableRow key={r.id} onClick={() => { setSelectedResult(r); setResolutionNotes(""); }} className="cursor-pointer hover:bg-muted/30">
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] border", severityColors[r.severity])}>{r.severity}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs font-medium">{r.rule_name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{r.rule_code}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {r.details?.ai_generated && <Brain className="inline h-3 w-3 mr-1 text-info" />}
                        {r.message}
                      </TableCell>
                      <TableCell>
                        {r.resolved ? (
                          <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30"><CheckCircle className="h-2.5 w-2.5 mr-1" />Resolved</Badge>
                        ) : r.auto_corrected ? (
                          <Badge variant="outline" className="text-[10px] bg-info/15 text-info border-info/30">Auto-Fixed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning border-warning/30">Open</Badge>
                        )}
                      </TableCell>
                      <TableCell><Shield className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-6 pt-4">
          {loadingRules ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            Object.entries(rulesByType).map(([type, typeRules]) => (
              <div key={type}>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  {type === "ai_clinical" && <Brain className="h-4 w-4 text-info" />}
                  {type.replace(/_/g, " ")} <Badge variant="secondary" className="text-[10px]">{typeRules.length}</Badge>
                </h3>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Code</TableHead>
                        <TableHead>Rule Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {typeRules.map((rule: any) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-mono text-xs">{rule.rule_code}</TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{rule.rule_name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{rule.description}</p>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{rule.category}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className={cn("text-[10px] border", severityColors[rule.severity])}>{rule.severity}</Badge></TableCell>
                          <TableCell>{rule.is_active ? <CheckCircle className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => {
                                  setEditingRule(rule);
                                  setEditorOpen(true);
                                }}
                              >
                                <Settings className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handleDeleteRule(rule.id)}
                                disabled={deleteRule.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedResult && !selectedResult.resolved} onOpenChange={(open) => !open && setSelectedResult(null)}>
        <DialogContent className="max-w-md">
          {selectedResult && (
            <>
              <DialogHeader>
                <DialogTitle>Resolve Scrub Finding</DialogTitle>
                <DialogDescription>{selectedResult.rule_name} ({selectedResult.rule_code})</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="rounded-md border p-3">
                  <Badge variant="outline" className={cn("text-[10px] border mb-2", severityColors[selectedResult.severity])}>{selectedResult.severity}</Badge>
                  <p className="text-sm">{selectedResult.message}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Resolution Notes</label>
                  <Textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} className="min-h-[60px] text-xs" />
                </div>
                <Button onClick={handleResolve} disabled={resolveResult.isPending} className="w-full gap-1">
                  {resolveResult.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                  Mark as Resolved
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <RuleEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        rule={editingRule}
        pending={saveRule.isPending}
        onSave={(payload) => saveRule.mutateAsync(payload)}
      />
    </div>
  );
}
