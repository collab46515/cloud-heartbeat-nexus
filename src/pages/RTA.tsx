import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRTAConfig, useRTATransactions, useSubmitRTA } from "@/hooks/useRTA";
import { useClaims } from "@/hooks/useClaims";
import { formatCurrency } from "@/data/mock-claims";
import { cn } from "@/lib/utils";
import { Zap, Loader2, CheckCircle, XCircle, Clock, Wifi, WifiOff, Send } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusColors: Record<string, string> = {
  approved: "bg-success/15 text-success border-success/30",
  pended: "bg-warning/15 text-warning border-warning/30",
  denied: "bg-destructive/15 text-destructive border-destructive/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function RTA() {
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const { data: rtaConfigs = [], isLoading: loadingConfig } = useRTAConfig();
  const { data: transactions = [], isLoading: loadingTxns } = useRTATransactions();

  const approved = transactions.filter(t => t.response_status === "approved").length;
  const pended = transactions.filter(t => t.response_status === "pended").length;
  const totalPlanPays = transactions.reduce((s, t) => s + Number(t.plan_pays || 0), 0);
  const avgResponseTime = transactions.length > 0
    ? Math.round(transactions.reduce((s, t) => s + (t.response_time_ms || 0), 0) / transactions.length)
    : 0;

  return (
    <div className="page-animate-in space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Real-Time Adjudication</h1>
          <p className="text-sm text-muted-foreground">Submit claims for instant payer adjudication and receive payment authorization in seconds.</p>
        </div>
        <Button size="sm" onClick={() => setShowSubmitDialog(true)} className="gap-1">
          <Zap className="h-4 w-4" /> Submit RTA
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Transactions</p>
            <p className="mt-1 text-2xl font-bold">{transactions.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Approved</p>
            <p className="mt-1 text-2xl font-bold text-success">{approved}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pended</p>
            <p className="mt-1 text-2xl font-bold text-warning">{pended}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Plan Payments</p>
            <p className="mt-1 text-2xl font-bold text-primary">{formatCurrency(totalPlanPays)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Response</p>
            <p className="mt-1 text-2xl font-bold">{avgResponseTime}ms</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList>
          <TabsTrigger value="transactions" className="gap-1"><Zap className="h-3 w-3" /> Transactions</TabsTrigger>
          <TabsTrigger value="payers" className="gap-1"><Wifi className="h-3 w-3" /> Payer RTA Config</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4 pt-4">
          {loadingTxns ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : transactions.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="p-8 text-center">
                <Zap className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">No RTA Transactions</p>
                <p className="text-xs text-muted-foreground">Submit a claim for real-time adjudication to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Claim</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Plan Pays</TableHead>
                    <TableHead className="text-right">Patient Resp</TableHead>
                    <TableHead className="text-right">Response Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn: any) => (
                    <TableRow key={txn.id}>
                      <TableCell className="font-mono text-[10px]">{txn.transaction_id || txn.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-mono text-xs">{txn.claims?.claim_number || "—"}</TableCell>
                      <TableCell className="text-sm">{txn.claims?.patients ? `${txn.claims.patients.first_name} ${txn.claims.patients.last_name}` : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{txn.payers?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] border", statusColors[txn.response_status] || "")}>
                          {txn.response_status === "approved" && <CheckCircle className="h-2.5 w-2.5 mr-1" />}
                          {txn.response_status === "pended" && <Clock className="h-2.5 w-2.5 mr-1" />}
                          {txn.response_status === "denied" && <XCircle className="h-2.5 w-2.5 mr-1" />}
                          {txn.response_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-success">{formatCurrency(Number(txn.plan_pays || 0))}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(txn.patient_responsibility || 0))}</TableCell>
                      <TableCell className="text-right text-sm">
                        <span className={cn(txn.response_time_ms > 2000 ? "text-warning" : "text-success")}>{txn.response_time_ms}ms</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payers" className="space-y-4 pt-4">
          {loadingConfig ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Payer</TableHead>
                    <TableHead>RTA Status</TableHead>
                    <TableHead>API Endpoint</TableHead>
                    <TableHead>Auth Type</TableHead>
                    <TableHead className="text-right">Max Charge</TableHead>
                    <TableHead className="text-right">Success Rate</TableHead>
                    <TableHead className="text-right">Avg Response</TableHead>
                    <TableHead>Fallback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rtaConfigs.map((cfg: any) => (
                    <TableRow key={cfg.id}>
                      <TableCell className="font-medium">{cfg.payers?.name || "—"}</TableCell>
                      <TableCell>
                        {cfg.rta_enabled ? (
                          <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30 gap-1">
                            <Wifi className="h-2.5 w-2.5" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <WifiOff className="h-2.5 w-2.5" /> Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[10px] max-w-xs truncate">{cfg.api_endpoint || "N/A"}</TableCell>
                      <TableCell className="text-xs capitalize">{cfg.auth_type || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{cfg.max_charge_amount ? formatCurrency(Number(cfg.max_charge_amount)) : "—"}</TableCell>
                      <TableCell className="text-right text-sm">{cfg.success_rate ? `${Number(cfg.success_rate).toFixed(1)}%` : "—"}</TableCell>
                      <TableCell className="text-right text-sm">{cfg.avg_response_time_ms ? `${cfg.avg_response_time_ms}ms` : "—"}</TableCell>
                      <TableCell>{cfg.fallback_to_batch ? <CheckCircle className="h-4 w-4 text-success" /> : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <RTASubmitDialog open={showSubmitDialog} onClose={() => setShowSubmitDialog(false)} />
    </div>
  );
}

function RTASubmitDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const { data: allClaims = [] } = useClaims();
  const eligibleClaims = allClaims.filter(c => ["draft", "scrubbing", "submitted", "pending"].includes(c.claim_status));
  const submitRTA = useSubmitRTA();

  const handleSubmit = async () => {
    if (!selectedClaimId) {
      toast.error("Select a claim");
      return;
    }
    try {
      const result = await submitRTA.mutateAsync(selectedClaimId);
      if (result.response_status === "approved") {
        toast.success(`RTA Approved! Plan pays: ${formatCurrency(Number(result.plan_pays))}`);
      } else {
        toast.warning(`RTA Pended: ${result.error_message || "Requires review"}`);
      }
      onClose();
      setSelectedClaimId("");
    } catch (e: any) {
      toast.error(e.message || "RTA submission failed");
    }
  };

  const selectedClaim = allClaims.find(c => c.id === selectedClaimId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-warning" /> Submit for Real-Time Adjudication</DialogTitle>
          <DialogDescription>Select a claim to submit for instant payer adjudication.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Select Claim</label>
            <Select value={selectedClaimId} onValueChange={setSelectedClaimId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose a claim…" /></SelectTrigger>
              <SelectContent>
                {eligibleClaims.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.claim_number} · {c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : "—"} · {formatCurrency(Number(c.total_charge_amount))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClaim && (
            <Card className="border-border/60">
              <CardContent className="p-3 space-y-1">
                <p className="text-sm font-medium">{selectedClaim.patients ? `${selectedClaim.patients.first_name} ${selectedClaim.patients.last_name}` : "—"}</p>
                <p className="text-xs text-muted-foreground">{selectedClaim.payers?.name} · {selectedClaim.claim_type}</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total Charge:</span>
                  <span className="font-mono font-bold">{formatCurrency(Number(selectedClaim.total_charge_amount))}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Service Date:</span>
                  <span>{selectedClaim.service_date}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={handleSubmit} disabled={submitRTA.isPending || !selectedClaimId} className="w-full gap-1">
            {submitRTA.isPending ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Processing…</>
            ) : (
              <><Send className="h-3 w-3" /> Submit for RTA</>
            )}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            Expected response time: &lt; 3 seconds · Timeout falls back to batch submission
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
