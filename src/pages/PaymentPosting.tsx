import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, FileUp, CheckCircle, AlertTriangle, Loader2, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function usePayments() {
  return useQuery({
    queryKey: ["patient-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_payments")
        .select("*, patients(first_name, last_name, mrn), claims(claim_number, total_charge_amount)")
        .order("payment_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

function usePostPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment: {
      patient_id: string;
      claim_id: string;
      amount: number;
      payment_method: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from("patient_payments").insert(payment);
      if (error) throw error;
      // Update claim paid amount
      const { data: claim } = await supabase.from("claims").select("total_paid_amount").eq("id", payment.claim_id).single();
      if (claim) {
        await supabase.from("claims").update({
          total_paid_amount: Number(claim.total_paid_amount) + payment.amount,
          claim_status: "paid",
        }).eq("id", payment.claim_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-payments"] });
      qc.invalidateQueries({ queryKey: ["claims"] });
      toast.success("Payment posted successfully");
    },
  });
}

function useUnpaidClaims() {
  return useQuery({
    queryKey: ["unpaid-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("id, claim_number, total_charge_amount, total_paid_amount, patient_id, patients(first_name, last_name)")
        .in("claim_status", ["submitted", "acknowledged", "pending", "partial_paid"])
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}

export default function PaymentPosting() {
  const { data: payments = [], isLoading } = usePayments();
  const { data: unpaidClaims = [] } = useUnpaidClaims();
  const postPayment = usePostPayment();
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("eft");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  const totalPosted = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const todayPayments = payments.filter((p: any) => new Date(p.payment_date).toDateString() === new Date().toDateString());
  const todayTotal = todayPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);

  const handlePost = async () => {
    const claim = unpaidClaims.find((c: any) => c.id === selectedClaim) as any;
    if (!claim || !amount) return;
    try {
      await postPayment.mutateAsync({
        patient_id: claim.patient_id,
        claim_id: claim.id,
        amount: parseFloat(amount),
        payment_method: method,
        notes: notes || undefined,
      });
      setPostDialogOpen(false);
      setSelectedClaim("");
      setAmount("");
      setNotes("");
    } catch {
      toast.error("Failed to post payment");
    }
  };

  const filtered = payments.filter((p: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.claims?.claim_number?.toLowerCase().includes(s) ||
      p.patients?.first_name?.toLowerCase().includes(s) ||
      p.patients?.last_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="page-animate-in space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Payment Posting</h1>
          <p className="text-sm text-muted-foreground">835 remittance processing, manual posting, and reconciliation.</p>
        </div>
        <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1"><Plus className="h-4 w-4" /> Post Payment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Post Payment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Claim</Label>
                <Select value={selectedClaim} onValueChange={setSelectedClaim}>
                  <SelectTrigger><SelectValue placeholder="Select claim" /></SelectTrigger>
                  <SelectContent>
                    {unpaidClaims.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.claim_number} — {c.patients?.first_name} {c.patients?.last_name} (${Number(c.total_charge_amount).toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <Label>Method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eft">EFT</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="era_835">ERA/835</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Check #, ERA trace, adjustments..." />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handlePost} disabled={!selectedClaim || !amount || postPayment.isPending}>
                {postPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Post Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="border-border/60"><CardContent className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Posted</p>
          <p className="mt-1 text-2xl font-bold">${totalPosted.toLocaleString("en", { minimumFractionDigits: 2 })}</p>
        </CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Today</p>
          <p className="mt-1 text-2xl font-bold text-primary">${todayTotal.toLocaleString("en", { minimumFractionDigits: 2 })}</p>
        </CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payments</p>
          <p className="mt-1 text-2xl font-bold">{payments.length}</p>
        </CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Unpaid Claims</p>
          <p className="mt-1 text-2xl font-bold text-warning">{unpaidClaims.length}</p>
        </CardContent></Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60"><CardContent className="p-8 text-center">
          <DollarSign className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No payments found</p>
          <p className="text-xs text-muted-foreground">Post payments manually or import ERA/835 files.</p>
        </CardContent></Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Claim</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm font-medium">{p.patients?.first_name} {p.patients?.last_name}</TableCell>
                  <TableCell className="text-sm">{p.claims?.claim_number || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] capitalize">{p.payment_method.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-right font-medium text-sm">${Number(p.amount).toFixed(2)}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px]", p.status === "completed" ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
