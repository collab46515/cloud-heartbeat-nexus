import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScrubRules, useScrubResults, useScrubStats, useResolveScrubResult, useRunScrub, useRunBulkScrub } from "@/hooks/useScrubbing";
import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, CheckCircle, XCircle, Loader2, Settings, Play, Zap, Brain } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const severityColors: Record<string, string> = {
  error: "bg-destructive/15 text-destructive border-destructive/30",
  warning: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  info: "bg-blue-500/15 text-blue-600 border-blue-500/30",
};

function ScrubStatsCards({ stats }: { stats: any }) {
  const cards = [
    { label: "Total Findings", value: stats?.total ?? 0 },
    { label: "Errors", value: stats?.errors ?? 0, className: "text-destructive" },
    { label: "Warnings", value: stats?.warnings ?? 0, className: "text-yellow-600" },
    { label: "Resolved", value: stats?.resolved ?? 0, className: "text-green-600" },
    { label: "Auto-Corrected", value: stats?.autoCorrected ?? 0, className: "text-blue-600" },
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
  const [selectedClaimId, setSelectedClaimId] = useState<string>("");
  const [scrubbing, setScrubbing] = useState(false);

  const { data: rules = [], isLoading: loadingRules } = useScrubRules();
  const { data: results = [], isLoading: loadingResults } = useScrubResults();
  const { data: stats } = useScrubStats();
  const resolveResult = useResolveScrubResult();
  const runScrub = useRunScrub();
  const runBulkScrub = useRunBulkScrub();

  // Fetch claims for scrub execution
  const { data: claims = [] } = useQuery({
    queryKey: ["claims-for-scrub"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("id, claim_number, claim_status, scrub_status, total_charge_amount, service_date")
        .in("claim_status", ["draft", "scrubbing"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const handleResolve = async () => {
    if (!selectedResult) return;
    try {
      await resolveResult.mutateAsync({ id: selectedResult.id, resolution_notes: resolutionNotes });
      toast.success("Scrub finding resolved");
      setSelectedResult(null);
      setResolutionNotes("");
    } catch {
      toast.error("Failed to resolve");
    }
  };

  const handleRunScrub = async () => {
    if (!selectedClaimId) {
      toast.error("Select a claim to scrub");
      return;
    }
    setScrubbing(true);
    try {
      const result = await runScrub.mutateAsync(selectedClaimId);
      toast.success(`Scrub complete: ${result.total_findings} findings (${result.errors} errors, ${result.warnings} warnings)`);
    } catch (e: any) {
      toast.error(`Scrub failed: ${e.message}`);
    } finally {
      setScrubbing(false);
    }
  };

  const handleBulkScrub = async () => {
    const draftClaims = claims.filter((c: any) => c.claim_status === "draft" || c.scrub_status === "pending");
    if (draftClaims.length === 0) {
      toast.error("No draft/pending claims to scrub");
      return;
    }
    setScrubbing(true);
    try {
      const results = await runBulkScrub.mutateAsync(draftClaims.map((c: any) => c.id));
      const passed = results.filter((r) => r.success).length;
      toast.success(`Bulk scrub: ${passed}/${results.length} claims processed`);
    } catch (e: any) {
      toast.error(`Bulk scrub failed: ${e.message}`);
    } finally {
      setScrubbing(false);
    }
  };

  // Group rules by type for the Rule Engine tab
  const rulesByType = rules.reduce((acc: Record<string, any[]>, rule: any) => {
    const type = rule.rule_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(rule);
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Claim Scrubbing Engine</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered multi-stage validation: Structural → CCI/MUE/NCCI → Modifier → Payer-Specific → AI Clinical
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-xs">
            <Brain className="h-3 w-3" /> {rules.length} Active Rules
          </Badge>
        </div>
      </div>

      <ScrubStatsCards stats={stats} />

      {/* Scrub Execution Panel */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Play className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedClaimId} onValueChange={setSelectedClaimId}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select claim to scrub..." />
                </SelectTrigger>
                <SelectContent>
                  {claims.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.claim_number} — ${Number(c.total_charge_amount).toLocaleString()} ({c.scrub_status || "pending"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleRunScrub} disabled={scrubbing || !selectedClaimId} className="gap-1">
              {scrubbing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
              Run Scrub
            </Button>
            <Button onClick={handleBulkScrub} disabled={scrubbing} variant="outline" className="gap-1">
              {scrubbing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              Bulk Scrub All Draft
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="results" className="w-full">
        <TabsList>
          <TabsTrigger value="results" className="gap-1"><AlertTriangle className="h-3 w-3" /> Scrub Results</TabsTrigger>
          <TabsTrigger value="rules" className="gap-1"><Settings className="h-3 w-3" /> Rule Engine ({rules.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4 pt-4">
          {loadingResults ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : results.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="p-8 text-center">
                <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-2" />
                <p className="text-sm font-medium text-foreground">No Scrub Findings</p>
                <p className="text-xs text-muted-foreground">All claims passed validation or no scrubs have been run yet.</p>
              </CardContent>
            </Card>
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
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setSelectedResult(r); setResolutionNotes(""); }}>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] border", severityColors[r.severity])}>
                          {r.severity === "error" ? <XCircle className="h-2.5 w-2.5 mr-1" /> : <AlertTriangle className="h-2.5 w-2.5 mr-1" />}
                          {r.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs font-medium">{r.rule_name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{r.rule_code}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {r.details?.ai_generated && <Brain className="inline h-3 w-3 mr-1 text-purple-500" />}
                        {r.message}
                      </TableCell>
                      <TableCell>
                        {r.resolved ? (
                          <Badge variant="outline" className="text-[10px] bg-green-500/15 text-green-600 border-green-500/30">
                            <CheckCircle className="h-2.5 w-2.5 mr-1" /> Resolved
                          </Badge>
                        ) : r.auto_corrected ? (
                          <Badge variant="outline" className="text-[10px] bg-blue-500/15 text-blue-600 border-blue-500/30">Auto-Fixed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-600 border-yellow-500/30">Open</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Shield className="h-3.5 w-3.5" /></Button>
                      </TableCell>
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
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  {type === "ai_clinical" && <Brain className="h-4 w-4 text-purple-500" />}
                  {type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Rules
                  <Badge variant="secondary" className="text-[10px]">{typeRules.length}</Badge>
                </h3>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-24">Code</TableHead>
                        <TableHead>Rule Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead className="text-center">Auto-Fix</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {typeRules.map((rule: any) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-mono text-xs font-medium">{rule.rule_code}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{rule.rule_name}</p>
                              <p className="text-xs text-muted-foreground">{rule.description}</p>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] capitalize">{rule.category.replace(/_/g, " ")}</Badge></TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[10px] border", severityColors[rule.severity])}>{rule.severity}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{rule.auto_correct ? <CheckCircle className="h-4 w-4 text-green-600 mx-auto" /> : "—"}</TableCell>
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

      {/* Resolve Dialog */}
      <Dialog open={!!selectedResult && !selectedResult.resolved} onOpenChange={(o) => !o && setSelectedResult(null)}>
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
                  {selectedResult.details?.ai_generated && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      <Brain className="inline h-3 w-3 mr-1" /> AI-generated finding: {selectedResult.details.ai_details}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Resolution Notes</label>
                  <Textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="Describe how this finding was resolved…" className="min-h-[60px] text-xs" />
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
    </div>
  );
}
