import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRTAConfig, useRTATransactions, useSubmitRTA } from "@/hooks/useRTA";
import { useRTAPrediction, type RTAPrediction } from "@/hooks/useRTAPrediction";
import { useClaims } from "@/hooks/useClaims";
import { formatCurrency } from "@/data/mock-claims";
import { cn } from "@/lib/utils";
import { Zap, Loader2, CheckCircle, XCircle, Clock, Wifi, WifiOff, Send, Brain, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

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

function RTAPredictionPanel({ prediction }: { prediction: RTAPrediction }) {
  const approvalPct = Math.round(prediction.expected_approval_probability * 100);
  const barColor = approvalPct > 80 ? "bg-success" : approvalPct > 50 ? "bg-warning" : "bg-destructive";

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Routing Recommendation</span>
        {prediction.latency_ms && (
          <span className="ml-auto text-[10px] text-muted-foreground">{prediction.latency_ms}ms</span>
        )}
      </div>

      {/* Recommendation */}
      <div className={cn("rounded-md border p-3", prediction.rta_recommended ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5")}>
        <div className="flex items-center gap-2">
          {prediction.rta_recommended ? (
            <CheckCircle className="h-4 w-4 text-success" />
          ) : (
            <Clock className="h-4 w-4 text-warning" />
          )}
          <span className="text-sm font-bold text-foreground">
            {prediction.rta_recommended ? "REAL-TIME ADJUDICATION RECOMMENDED" : "BATCH SUBMISSION RECOMMENDED"}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{prediction.recommendation_reason}</p>
      </div>

      {/* Approval probability */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Expected RTA Approval</span>
          <span className="font-bold">{approvalPct}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-muted">
          <div className={cn("h-2.5 rounded-full transition-all duration-700", barColor)} style={{ width: `${approvalPct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Confidence: {Math.round(prediction.confidence * 100)}%</span>
          {prediction.expected_response_time_ms && (
            <span>Est. response: {prediction.expected_response_time_ms}ms</span>
          )}
        </div>
      </div>

      {/* Payment breakdown */}
      {(prediction.expected_plan_pays || prediction.expected_patient_responsibility) && (
        <div className="grid grid-cols-3 gap-2">
          {prediction.expected_allowed_amount && (
            <div className="rounded-md border p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Allowed</p>
              <p className="text-sm font-bold">{formatCurrency(prediction.expected_allowed_amount)}</p>
            </div>
          )}
          {prediction.expected_plan_pays && (
            <div className="rounded-md border border-success/20 bg-success/5 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Plan Pays</p>
              <p className="text-sm font-bold text-success">{formatCurrency(prediction.expected_plan_pays)}</p>
            </div>
          )}
          {prediction.expected_patient_responsibility && (
            <div className="rounded-md border p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Patient Resp</p>
              <p className="text-sm font-bold">{formatCurrency(prediction.expected_patient_responsibility)}</p>
            </div>
          )}
        </div>
      )}

      {/* Risk factors */}
      {prediction.risk_factors?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Routing Factors</p>
          {prediction.risk_factors.map((rf, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              {rf.impact === "positive" ? (
                <TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-success" />
              ) : rf.impact === "negative" ? (
                <TrendingDown className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
              ) : (
                <Minus className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              )}
              <div>
                <span className="font-medium text-foreground">{rf.factor}: </span>
                <span className="text-muted-foreground">{rf.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Batch comparison */}
      <div className="rounded-md border border-dashed p-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">vs. Batch Submission</p>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">Payment in <span className="font-bold text-foreground">{prediction.batch_comparison.expected_days_to_payment} days</span></span>
          <span className="text-muted-foreground">Approval rate: <span className="font-bold text-foreground">{Math.round(prediction.batch_comparison.expected_approval_rate * 100)}%</span></span>
        </div>
      </div>
    </div>
  );
}

function RTASubmitDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const { data: allClaims = [] } = useClaims();
  const eligibleClaims = allClaims.filter(c => ["draft", "scrubbing", "submitted", "pending"].includes(c.claim_status));
  const submitRTA = useSubmitRTA();
  const { predict, prediction, loading: predicting } = useRTAPrediction();

  const handleClaimSelect = (claimId: string) => {
    setSelectedClaimId(claimId);
    if (claimId) predict(claimId);
  };

  const handleSubmit = async () => {
    if (!selectedClaimId) { toast.error("Select a claim"); return; }
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-warning" /> Submit for Real-Time Adjudication</DialogTitle>
          <DialogDescription>Select a claim — AI will analyze RTA readiness before submission.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Select Claim</label>
            <Select value={selectedClaimId} onValueChange={handleClaimSelect}>
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
              </CardContent>
            </Card>
          )}

          {/* AI Prediction */}
          {predicting && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing RTA readiness…
            </div>
          )}

          {prediction && !predicting && <RTAPredictionPanel prediction={prediction} />}

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={submitRTA.isPending || !selectedClaimId} className="flex-1 gap-1">
              {submitRTA.isPending ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Processing…</>
              ) : (
                <><Zap className="h-3 w-3" /> Submit Real-Time</>
              )}
            </Button>
            {prediction && !prediction.rta_recommended && (
              <Button variant="outline" onClick={onClose} className="gap-1">
                <Clock className="h-3 w-3" /> Use Batch Instead
              </Button>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Expected response time: &lt; 3 seconds · Timeout falls back to batch submission
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
