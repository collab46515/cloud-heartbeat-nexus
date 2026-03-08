import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useBatchSubmissions, useCreateBatch } from "@/hooks/useBatches";
import { useClaims, usePayers } from "@/hooks/useClaims";
import { formatCurrency } from "@/data/mock-claims";
import { cn } from "@/lib/utils";
import { Package, Loader2, Plus, Send, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const batchStatusColors: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  submitted: "bg-primary/15 text-primary border-primary/30",
  accepted: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  partial: "bg-info/15 text-info border-info/30",
};

export default function Batches() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: batches = [], isLoading } = useBatchSubmissions();

  const totalClaims = batches.reduce((s, b) => s + (b.claim_count || 0), 0);
  const totalCharges = batches.reduce((s, b) => s + Number(b.total_charges || 0), 0);
  const accepted = batches.filter(b => b.status === "accepted").length;
  const pending = batches.filter(b => b.status === "pending" || b.status === "submitted").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Batch Submissions</h1>
          <p className="text-sm text-muted-foreground">Create EDI 837 batches, track submission status, and manage payment remittances.</p>
        </div>
        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Create Batch
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Batches</p>
            <p className="mt-1 text-3xl font-bold">{batches.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Claims</p>
            <p className="mt-1 text-3xl font-bold">{totalClaims}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Charges</p>
            <p className="mt-1 text-3xl font-bold text-primary">{formatCurrency(totalCharges)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Accepted / Pending</p>
            <p className="mt-1 text-3xl font-bold">
              <span className="text-success">{accepted}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-warning">{pending}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Batch #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Clearinghouse</TableHead>
                <TableHead className="text-center">Claims</TableHead>
                <TableHead className="text-right">Total Charges</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono text-xs font-medium">{batch.batch_number}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{batch.batch_type}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{batch.clearinghouse || "—"}</TableCell>
                  <TableCell className="text-center text-sm">{batch.claim_count}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(batch.total_charges || 0))}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px] border", batchStatusColors[batch.status] || "")}>
                      {batch.status === "accepted" && <CheckCircle className="h-2.5 w-2.5 mr-1" />}
                      {batch.status === "rejected" && <XCircle className="h-2.5 w-2.5 mr-1" />}
                      {(batch.status === "pending" || batch.status === "submitted") && <Clock className="h-2.5 w-2.5 mr-1" />}
                      {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{batch.submitted_at ? new Date(batch.submitted_at).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(batch.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {batches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No batches created yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateBatchDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
    </div>
  );
}

function CreateBatchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [batchType, setBatchType] = useState("837P");
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);
  const { data: claims = [] } = useClaims({ status: "scrubbing" });
  const draftClaims = claims.filter(c => ["draft", "scrubbing"].includes(c.claim_status));
  const { data: submittedClaims = [] } = useClaims({ status: "submitted" });
  const allEligible = [...draftClaims];
  const createBatch = useCreateBatch();

  const toggleClaim = (id: string) => {
    setSelectedClaims(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (selectedClaims.length === 0) {
      toast.error("Select at least one claim");
      return;
    }
    try {
      await createBatch.mutateAsync({
        batch_type: batchType,
        claim_ids: selectedClaims,
      });
      toast.success("Batch created successfully");
      onClose();
      setSelectedClaims([]);
    } catch {
      toast.error("Failed to create batch");
    }
  };

  // Also show "submitted" claims for batch creation
  const { data: allClaims = [] } = useClaims();
  const eligibleClaims = allClaims.filter(c => !["paid", "void", "denied"].includes(c.claim_status));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Create Submission Batch</DialogTitle>
          <DialogDescription>Select claims to include in an EDI 837 batch submission.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Batch Type</label>
              <Select value={batchType} onValueChange={setBatchType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="837P">837P (Professional)</SelectItem>
                  <SelectItem value="837I">837I (Institutional)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">Select Claims ({selectedClaims.length} selected)</label>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedClaims(eligibleClaims.map(c => c.id))}>
                Select All
              </Button>
            </div>
            <div className="rounded-lg border max-h-64 overflow-y-auto">
              {eligibleClaims.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">No eligible claims</p>
              ) : (
                eligibleClaims.map((claim) => (
                  <div key={claim.id} className="flex items-center gap-3 border-b last:border-0 px-3 py-2 hover:bg-muted/30">
                    <Checkbox checked={selectedClaims.includes(claim.id)} onCheckedChange={() => toggleClaim(claim.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-medium">{claim.claim_number}</p>
                      <p className="text-[10px] text-muted-foreground">{claim.patients ? `${claim.patients.first_name} ${claim.patients.last_name}` : "—"} · {claim.payers?.name}</p>
                    </div>
                    <span className="font-mono text-xs">{formatCurrency(Number(claim.total_charge_amount))}</span>
                    <Badge variant="outline" className="text-[10px]">{claim.claim_status}</Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
            <div>
              <p className="text-sm font-medium">{selectedClaims.length} claims selected</p>
              <p className="text-xs text-muted-foreground">
                Total charges: {formatCurrency(eligibleClaims.filter(c => selectedClaims.includes(c.id)).reduce((s, c) => s + Number(c.total_charge_amount), 0))}
              </p>
            </div>
            <Button onClick={handleCreate} disabled={createBatch.isPending || selectedClaims.length === 0} className="gap-1">
              {createBatch.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Create & Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
