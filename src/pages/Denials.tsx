import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDenialWorkflows, useDenialStats, useUpdateDenialWorkflow } from "@/hooks/useDenials";
import { useAppealGenerator, type AppealResult } from "@/hooks/useAppealGenerator";
import { formatCurrency } from "@/data/mock-claims";
import { cn } from "@/lib/utils";
import { ShieldAlert, FileText, Loader2, Brain, Sparkles, CheckCircle2, ClipboardCopy, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const statusColors: Record<string, string> = {
  new: "bg-destructive/15 text-destructive border-destructive/30",
  in_review: "bg-warning/15 text-warning border-warning/30",
  appeal_drafted: "bg-info/15 text-info border-info/30",
  appeal_submitted: "bg-primary/15 text-primary border-primary/30",
  appeal_approved: "bg-success/15 text-success border-success/30",
  appeal_denied: "bg-destructive/15 text-destructive border-destructive/30",
  write_off_requested: "bg-muted text-muted-foreground",
  write_off_approved: "bg-muted text-muted-foreground",
  closed: "bg-muted text-muted-foreground",
};

const categoryLabels: Record<string, string> = {
  clinical: "Clinical",
  technical: "Technical",
  authorization: "Authorization",
  eligibility: "Eligibility",
  duplicate: "Duplicate",
  timely_filing: "Timely Filing",
  bundling: "Bundling",
  coding: "Coding",
  other: "Other",
};

function AppealPanel({ result, loading }: { result: AppealResult | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 space-y-3">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">AI is generating your appeal letter...</span>
        </div>
        <Progress value={60} className="h-1.5" />
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="space-y-4">
      {/* Strategy header */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">AI Appeal Strategy</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Success Likelihood</span>
            <Badge variant="outline" className={cn("text-xs font-mono",
              result.success_likelihood >= 0.7 ? "border-success/40 text-success" :
              result.success_likelihood >= 0.4 ? "border-warning/40 text-warning" :
              "border-destructive/40 text-destructive"
            )}>
              {(result.success_likelihood * 100).toFixed(0)}%
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{result.strategy_summary}</p>

        {/* Key arguments */}
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Key Arguments</p>
          <ul className="space-y-1">
            {result.key_arguments.map((arg, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="h-3 w-3 mt-0.5 text-success shrink-0" />
                <span>{arg}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Supporting docs */}
        <div className="flex flex-wrap gap-2">
          {result.supporting_documents_needed.map((doc, i) => (
            <Badge key={i} variant="outline" className="text-[10px] gap-1"><BookOpen className="h-2.5 w-2.5" />{doc}</Badge>
          ))}
        </div>

        {/* Citations */}
        {result.citations && result.citations.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Citations</p>
            <div className="flex flex-wrap gap-1">
              {result.citations.map((c, i) => (
                <span key={i} className="text-[10px] text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">{c}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Appeal letter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Generated Appeal Letter</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => {
              navigator.clipboard.writeText(result.appeal_letter);
              toast.success("Appeal letter copied to clipboard");
            }}
          >
            <ClipboardCopy className="h-3 w-3" /> Copy
          </Button>
        </div>
        <ScrollArea className="h-64 rounded-md border bg-background p-3">
          <pre className="whitespace-pre-wrap text-xs font-sans leading-relaxed text-foreground">{result.appeal_letter}</pre>
        </ScrollArea>
      </div>
    </div>
  );
}

export default function Denials() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedDenial, setSelectedDenial] = useState<any>(null);
  const [appealNotes, setAppealNotes] = useState("");

  const { data: denials = [], isLoading } = useDenialWorkflows({ status: statusFilter, category: categoryFilter });
  const { data: stats } = useDenialStats();
  const updateDenial = useUpdateDenialWorkflow();
  const { generate, result: appealResult, loading: appealLoading } = useAppealGenerator();

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await updateDenial.mutateAsync({ id, appeal_status: newStatus });
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleGenerateAppeal = async (denialId: string) => {
    try { await generate(denialId); } catch {}
  };

  return (
    <div className="page-animate-in space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Denial Management</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Track, appeal, and resolve claim denials with AI-powered appeal generation.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Denials</p><p className="mt-1 text-2xl font-bold text-foreground">{stats?.total ?? 0}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Denied Amount</p><p className="mt-1 text-2xl font-bold text-destructive">{formatCurrency(stats?.totalAmount ?? 0)}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Open</p><p className="mt-1 text-2xl font-bold text-warning">{stats?.open ?? 0}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">In Appeal</p><p className="mt-1 text-2xl font-bold text-primary">{stats?.appealed ?? 0}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Overturned</p><p className="mt-1 text-2xl font-bold text-success">{stats?.overturned ?? 0}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Write-offs</p><p className="mt-1 text-2xl font-bold text-muted-foreground">{stats?.writeOffs ?? 0}</p></CardContent></Card>
      </div>

      {/* Category Breakdown */}
      {stats?.byCat && Object.keys(stats.byCat).length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" /> Denials by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCat).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <span className="text-xs font-medium text-foreground">{categoryLabels[cat] || cat}</span>
                  <Badge variant="outline" className="text-[10px]">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.keys(statusColors).map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{denials.length} denials</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Claim #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>CARC</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {denials.map((d: any) => (
                <TableRow key={d.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setSelectedDenial(d); setAppealNotes(d.resolution_notes || ""); }}>
                  <TableCell className="font-mono text-xs">{d.claims?.claim_number ?? "—"}</TableCell>
                  <TableCell className="text-sm">{d.claims?.patients ? `${d.claims.patients.first_name} ${d.claims.patients.last_name}` : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">{d.claims?.payers?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{categoryLabels[d.denial_category] || d.denial_category}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{d.carc_code || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-destructive">{formatCurrency(Number(d.denial_amount))}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px] border", statusColors[d.appeal_status] || "")}>
                      {d.appeal_status?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-center">{d.appeal_level}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><FileText className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {denials.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No denials found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog with AI Appeal */}
      <Dialog open={!!selectedDenial} onOpenChange={(o) => { if (!o) setSelectedDenial(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedDenial && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Denial Detail
                  <Badge variant="outline" className={cn("text-[10px] border", statusColors[selectedDenial.appeal_status] || "")}>
                    {selectedDenial.appeal_status?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedDenial.claims?.claim_number} · {categoryLabels[selectedDenial.denial_category]} · {formatCurrency(Number(selectedDenial.denial_amount))}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">CARC: </span><span className="font-mono font-medium">{selectedDenial.carc_code || "—"}</span></div>
                  <div><span className="text-muted-foreground">RARC: </span><span className="font-mono font-medium">{selectedDenial.rarc_code || "—"}</span></div>
                  <div><span className="text-muted-foreground">Group: </span><span className="font-medium">{selectedDenial.group_code || "—"}</span></div>
                  <div><span className="text-muted-foreground">Deadline: </span><span className="font-medium">{selectedDenial.appeal_deadline ? new Date(selectedDenial.appeal_deadline).toLocaleDateString() : "—"}</span></div>
                </div>
                {selectedDenial.carc_description && (
                  <p className="text-xs text-muted-foreground">{selectedDenial.carc_description}</p>
                )}

                {/* AI Appeal Generator */}
                <div className="space-y-2">
                  <Button
                    className="gap-2 w-full"
                    variant="outline"
                    onClick={() => handleGenerateAppeal(selectedDenial.id)}
                    disabled={appealLoading}
                  >
                    {appealLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                    {appealLoading ? "Generating Appeal..." : "Generate AI Appeal Letter"}
                  </Button>
                  <AppealPanel result={appealResult} loading={appealLoading} />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Update Status</label>
                  <Select value={selectedDenial.appeal_status} onValueChange={(v) => handleStatusUpdate(selectedDenial.id, v)}>
                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(statusColors).map((s) => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Resolution Notes</label>
                  <Textarea
                    value={appealNotes}
                    onChange={(e) => setAppealNotes(e.target.value)}
                    placeholder="Enter appeal details or resolution notes…"
                    className="mt-1 min-h-[60px] text-xs"
                  />
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={async () => {
                      await updateDenial.mutateAsync({ id: selectedDenial.id, resolution_notes: appealNotes });
                      toast.success("Notes saved");
                    }}
                  >
                    Save Notes
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
