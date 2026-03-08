import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useDenialWorkflows, useDenialStats, useUpdateDenialWorkflow } from "@/hooks/useDenials";
import { formatCurrency } from "@/data/mock-claims";
import { cn } from "@/lib/utils";
import { ShieldAlert, AlertTriangle, TrendingUp, FileText, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

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

export default function Denials() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedDenial, setSelectedDenial] = useState<any>(null);
  const [appealNotes, setAppealNotes] = useState("");

  const { data: denials = [], isLoading } = useDenialWorkflows({ status: statusFilter, category: categoryFilter });
  const { data: stats } = useDenialStats();
  const updateDenial = useUpdateDenialWorkflow();

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await updateDenial.mutateAsync({ id, appeal_status: newStatus });
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Denial Management</h1>
        <p className="text-sm text-muted-foreground">Track, appeal, and resolve claim denials across all payers.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Denials</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Denied Amount</p>
            <p className="mt-1 text-2xl font-bold text-destructive">{formatCurrency(stats?.totalAmount ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Open</p>
            <p className="mt-1 text-2xl font-bold text-warning">{stats?.open ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">In Appeal</p>
            <p className="mt-1 text-2xl font-bold text-primary">{stats?.appealed ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Overturned</p>
            <p className="mt-1 text-2xl font-bold text-success">{stats?.overturned ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Write-offs</p>
            <p className="mt-1 text-2xl font-bold text-muted-foreground">{stats?.writeOffs ?? 0}</p>
          </CardContent>
        </Card>
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
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.keys(statusColors).map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
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
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Claim #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>CARC</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Appeal Level</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {denials.map((d: any) => (
                <TableRow key={d.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedDenial(d)}>
                  <TableCell className="font-mono text-xs">{d.claims?.claim_number ?? "—"}</TableCell>
                  <TableCell className="text-sm">{d.claims?.patients ? `${d.claims.patients.first_name} ${d.claims.patients.last_name}` : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.claims?.payers?.name ?? "—"}</TableCell>
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
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No denials found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedDenial} onOpenChange={(o) => !o && setSelectedDenial(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedDenial && (
            <>
              <DialogHeader>
                <DialogTitle>Denial Detail</DialogTitle>
                <DialogDescription>
                  {selectedDenial.claims?.claim_number} · {categoryLabels[selectedDenial.denial_category]}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">CARC: </span><span className="font-mono font-medium">{selectedDenial.carc_code || "—"}</span></div>
                  <div><span className="text-muted-foreground">RARC: </span><span className="font-mono font-medium">{selectedDenial.rarc_code || "—"}</span></div>
                  <div><span className="text-muted-foreground">Group: </span><span className="font-medium">{selectedDenial.group_code || "—"}</span></div>
                  <div><span className="text-muted-foreground">Amount: </span><span className="font-medium text-destructive">{formatCurrency(Number(selectedDenial.denial_amount))}</span></div>
                </div>
                {selectedDenial.carc_description && (
                  <p className="text-xs text-muted-foreground">{selectedDenial.carc_description}</p>
                )}

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
