import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useScrubRules, useScrubResults, useScrubStats, useResolveScrubResult } from "@/hooks/useScrubbing";
import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, CheckCircle, XCircle, Loader2, Filter, Settings } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const severityColors: Record<string, string> = {
  error: "bg-destructive/15 text-destructive border-destructive/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  info: "bg-info/15 text-info border-info/30",
};

export default function Scrubbing() {
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const { data: rules = [], isLoading: loadingRules } = useScrubRules();
  const { data: results = [], isLoading: loadingResults } = useScrubResults();
  const { data: stats } = useScrubStats();
  const resolveResult = useResolveScrubResult();

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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Claim Scrubbing</h1>
        <p className="text-sm text-muted-foreground">Automated claim validation with CCI, MUE, modifier, and payer-specific edit rules.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Findings</p>
            <p className="mt-1 text-2xl font-bold">{stats?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Errors</p>
            <p className="mt-1 text-2xl font-bold text-destructive">{stats?.errors ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Warnings</p>
            <p className="mt-1 text-2xl font-bold text-warning">{stats?.warnings ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Resolved</p>
            <p className="mt-1 text-2xl font-bold text-success">{stats?.resolved ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Auto-Corrected</p>
            <p className="mt-1 text-2xl font-bold text-info">{stats?.autoCorrected ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Claims Affected</p>
            <p className="mt-1 text-2xl font-bold">{stats?.uniqueClaims ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="results" className="w-full">
        <TabsList>
          <TabsTrigger value="results" className="gap-1"><AlertTriangle className="h-3 w-3" /> Scrub Results</TabsTrigger>
          <TabsTrigger value="rules" className="gap-1"><Settings className="h-3 w-3" /> Rule Engine</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4 pt-4">
          {loadingResults ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : results.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="p-8 text-center">
                <CheckCircle className="mx-auto h-8 w-8 text-success mb-2" />
                <p className="text-sm font-medium text-foreground">No Scrub Findings</p>
                <p className="text-xs text-muted-foreground">All claims have passed validation or no scrub results exist yet.</p>
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
                      <TableCell className="text-sm max-w-xs truncate">{r.message}</TableCell>
                      <TableCell>
                        {r.resolved ? (
                          <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30">
                            <CheckCircle className="h-2.5 w-2.5 mr-1" /> Resolved
                          </Badge>
                        ) : r.auto_corrected ? (
                          <Badge variant="outline" className="text-[10px] bg-info/15 text-info border-info/30">Auto-Fixed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning border-warning/30">Open</Badge>
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

        <TabsContent value="rules" className="space-y-4 pt-4">
          {loadingRules ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Code</TableHead>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Auto-Correct</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-mono text-xs font-medium">{rule.rule_code}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{rule.rule_name}</p>
                          <p className="text-xs text-muted-foreground">{rule.description}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{rule.rule_type.replace("_", " ")}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{rule.category.replace("_", " ")}</Badge></TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] border", severityColors[rule.severity])}>{rule.severity}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{rule.auto_correct ? <CheckCircle className="h-4 w-4 text-success mx-auto" /> : "—"}</TableCell>
                      <TableCell className="text-center">{rule.is_active ? <CheckCircle className="h-4 w-4 text-success mx-auto" /> : <XCircle className="h-4 w-4 text-destructive mx-auto" />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
