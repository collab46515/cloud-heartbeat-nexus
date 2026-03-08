import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, CreditCard, Plus, Loader2, Search, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function usePaymentPlans() {
  return useQuery({
    queryKey: ["payment-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_payment_plans")
        .select("*, patients(first_name, last_name, mrn), claims(claim_number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useCreditBalances() {
  return useQuery({
    queryKey: ["credit-balances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_balances")
        .select("*, patients(first_name, last_name), claims(claim_number), payers(name)")
        .order("identified_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function usePatientPayments() {
  return useQuery({
    queryKey: ["patient-payments-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_payments")
        .select("*, patients(first_name, last_name)")
        .order("payment_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

function useCreatePaymentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: { patient_id: string; claim_id?: string; total_balance: number; monthly_amount: number; number_of_payments: number }) => {
      const { error } = await supabase.from("patient_payment_plans").insert({
        ...plan,
        remaining_balance: plan.total_balance,
        next_payment_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-plans"] });
      toast.success("Payment plan created");
    },
  });
}

function usePatientsList() {
  return useQuery({
    queryKey: ["patients-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("id, first_name, last_name, mrn").eq("is_active", true).order("last_name").limit(200);
      if (error) throw error;
      return data;
    },
  });
}

const planStatusColors: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  completed: "bg-primary/15 text-primary border-primary/30",
  defaulted: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground",
};

const refundStatusColors: Record<string, string> = {
  identified: "bg-warning/15 text-warning border-warning/30",
  approved: "bg-info/15 text-info border-info/30",
  refunded: "bg-success/15 text-success border-success/30",
  written_off: "bg-muted text-muted-foreground",
};

export default function PatientFinancial() {
  const { data: plans = [], isLoading: loadingPlans } = usePaymentPlans();
  const { data: credits = [], isLoading: loadingCredits } = useCreditBalances();
  const { data: payments = [] } = usePatientPayments();
  const { data: patients = [] } = usePatientsList();
  const createPlan = useCreatePaymentPlan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ patient_id: "", total_balance: "", monthly_amount: "", number_of_payments: "6" });

  const activePlans = plans.filter((p: any) => p.status === "active");
  const totalOutstanding = activePlans.reduce((s: number, p: any) => s + Number(p.remaining_balance), 0);
  const totalCredits = credits.filter((c: any) => c.refund_status === "identified").reduce((s: number, c: any) => s + Number(c.amount), 0);
  const recentPayments = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);

  const handleCreate = async () => {
    if (!form.patient_id || !form.total_balance || !form.monthly_amount) return;
    try {
      await createPlan.mutateAsync({
        patient_id: form.patient_id,
        total_balance: parseFloat(form.total_balance),
        monthly_amount: parseFloat(form.monthly_amount),
        number_of_payments: parseInt(form.number_of_payments),
      });
      setDialogOpen(false);
      setForm({ patient_id: "", total_balance: "", monthly_amount: "", number_of_payments: "6" });
    } catch { toast.error("Failed to create plan"); }
  };

  return (
    <div className="page-animate-in space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Patient Financial Engagement</h1>
          <p className="text-sm text-muted-foreground">Payment plans, cost estimates, collections, and credit balance management.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="gap-1"><Plus className="h-4 w-4" /> New Plan</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Payment Plan</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Patient</Label>
                <Select value={form.patient_id} onValueChange={v => setForm(f => ({ ...f, patient_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.last_name}, {p.first_name} ({p.mrn})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Total Balance</Label><Input type="number" step="0.01" value={form.total_balance} onChange={e => setForm(f => ({ ...f, total_balance: e.target.value }))} placeholder="0.00" /></div>
                <div><Label>Monthly</Label><Input type="number" step="0.01" value={form.monthly_amount} onChange={e => setForm(f => ({ ...f, monthly_amount: e.target.value }))} placeholder="0.00" /></div>
                <div><Label>Payments</Label><Input type="number" value={form.number_of_payments} onChange={e => setForm(f => ({ ...f, number_of_payments: e.target.value }))} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate} disabled={createPlan.isPending}>{createPlan.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Create Plan</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Plans</p><p className="mt-1 text-2xl font-bold">{activePlans.length}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Outstanding</p><p className="mt-1 text-2xl font-bold text-warning">${totalOutstanding.toLocaleString("en", { minimumFractionDigits: 2 })}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Collected</p><p className="mt-1 text-2xl font-bold text-success">${recentPayments.toLocaleString("en", { minimumFractionDigits: 2 })}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Credit Balances</p><p className="mt-1 text-2xl font-bold text-destructive">${totalCredits.toLocaleString("en", { minimumFractionDigits: 2 })}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="plans" className="w-full">
        <TabsList>
          <TabsTrigger value="plans" className="gap-1"><Wallet className="h-3 w-3" /> Payment Plans</TabsTrigger>
          <TabsTrigger value="credits" className="gap-1"><CreditCard className="h-3 w-3" /> Credit Balances</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="pt-4">
          {loadingPlans ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : plans.length === 0 ? (
            <Card className="border-border/60"><CardContent className="p-8 text-center">
              <Wallet className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No payment plans</p>
              <p className="text-xs text-muted-foreground">Create interest-free payment plans for patients.</p>
            </CardContent></Card>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead>Patient</TableHead><TableHead>Total</TableHead><TableHead>Monthly</TableHead><TableHead>Remaining</TableHead><TableHead>Payments</TableHead><TableHead>Next Due</TableHead><TableHead>Auto-Pay</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {plans.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.patients?.first_name} {p.patients?.last_name}</TableCell>
                      <TableCell className="text-sm">${Number(p.total_balance).toFixed(2)}</TableCell>
                      <TableCell className="text-sm">${Number(p.monthly_amount).toFixed(2)}</TableCell>
                      <TableCell className="text-sm font-medium">${Number(p.remaining_balance).toFixed(2)}</TableCell>
                      <TableCell className="text-sm">{p.payments_made}/{p.number_of_payments}</TableCell>
                      <TableCell className="text-sm">{p.next_payment_date ? new Date(p.next_payment_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{p.auto_pay ? <CheckCircle className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4 text-muted-foreground" />}</TableCell>
                      <TableCell><Badge variant="outline" className={cn("text-[10px] border", planStatusColors[p.status] || "")}>{p.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="credits" className="pt-4">
          {loadingCredits ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : credits.length === 0 ? (
            <Card className="border-border/60"><CardContent className="p-8 text-center">
              <CreditCard className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No credit balances</p>
              <p className="text-xs text-muted-foreground">Credit balances from overpayments will appear here.</p>
            </CardContent></Card>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead>Patient</TableHead><TableHead>Claim</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Payer</TableHead><TableHead>Medicare 60-Day</TableHead><TableHead>Deadline</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {credits.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-sm">{c.patients?.first_name} {c.patients?.last_name}</TableCell>
                      <TableCell className="text-sm">{c.claims?.claim_number || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{c.credit_type.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-sm font-medium">${Number(c.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-sm">{c.payers?.name || "—"}</TableCell>
                      <TableCell>{c.is_medicare_60_day ? <AlertTriangle className="h-4 w-4 text-destructive" /> : "—"}</TableCell>
                      <TableCell className="text-sm">{c.compliance_deadline ? new Date(c.compliance_deadline).toLocaleDateString() : "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={cn("text-[10px] border", refundStatusColors[c.refund_status] || "")}>{c.refund_status.replace(/_/g, " ")}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
