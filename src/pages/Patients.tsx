import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { usePatients, usePatientClaims, usePatientPayments, usePatientPaymentPlans, useCreatePayment, useCreatePaymentPlan, type PatientRow } from "@/hooks/usePatients";
import { formatCurrency, formatClaimStatus, getClaimStatusColor } from "@/data/mock-claims";
import { cn } from "@/lib/utils";
import { Users, Search, Loader2, Eye, CreditCard, FileText, Calendar, DollarSign, Shield } from "lucide-react";
import { toast } from "sonner";

export default function Patients() {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);

  const { data: patients = [], isLoading } = usePatients(search);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Patient Access</h1>
        <p className="text-sm text-muted-foreground">Patient registry, eligibility, insurance verification, and financial engagement.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Patients</p>
            <p className="mt-1 text-3xl font-bold">{patients.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active</p>
            <p className="mt-1 text-3xl font-bold text-success">{patients.filter(p => p.is_active).length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">With Insurance</p>
            <p className="mt-1 text-3xl font-bold text-primary">{patients.filter(p => Array.isArray(p.insurance) && (p.insurance as any[]).length > 0).length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Verified</p>
            <p className="mt-1 text-3xl font-bold text-info">{patients.filter(p => {
              const ins = p.insurance as any[];
              return Array.isArray(ins) && ins.some((i: any) => i.eligibility_status === "active");
            }).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, MRN, or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-9 text-sm" />
      </div>

      {/* Patient Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>MRN</TableHead>
                <TableHead>Patient Name</TableHead>
                <TableHead>DOB</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Primary Insurance</TableHead>
                <TableHead>Eligibility</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient) => {
                const ins = Array.isArray(patient.insurance) ? (patient.insurance as any[])[0] : null;
                return (
                  <TableRow key={patient.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedPatient(patient)}>
                    <TableCell className="font-mono text-xs font-medium">{patient.mrn}</TableCell>
                    <TableCell className="font-medium">{patient.first_name} {patient.last_name}</TableCell>
                    <TableCell className="text-sm">{patient.dob}</TableCell>
                    <TableCell className="text-sm">{patient.gender || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{patient.phone || "—"}</TableCell>
                    <TableCell className="text-sm">{ins?.payer_name || "Uninsured"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] border",
                        ins?.eligibility_status === "active" ? "bg-success/15 text-success border-success/30" :
                        ins?.eligibility_status === "inactive" ? "bg-destructive/15 text-destructive border-destructive/30" :
                        "bg-warning/15 text-warning border-warning/30"
                      )}>
                        {ins?.eligibility_status || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {patients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No patients found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Patient Detail Sheet */}
      <Sheet open={!!selectedPatient} onOpenChange={(o) => !o && setSelectedPatient(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="sr-only">Patient Details</SheetTitle>
          </SheetHeader>
          {selectedPatient && (
            <PatientDetailPanel
              patient={selectedPatient}
              onCollectPayment={() => setShowPaymentDialog(true)}
              onCreatePlan={() => setShowPlanDialog(true)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Payment Dialog */}
      {selectedPatient && (
        <>
          <PaymentDialog
            open={showPaymentDialog}
            onClose={() => setShowPaymentDialog(false)}
            patientId={selectedPatient.id}
          />
          <PaymentPlanDialog
            open={showPlanDialog}
            onClose={() => setShowPlanDialog(false)}
            patientId={selectedPatient.id}
          />
        </>
      )}
    </div>
  );
}

function PatientDetailPanel({ patient, onCollectPayment, onCreatePlan }: { patient: PatientRow; onCollectPayment: () => void; onCreatePlan: () => void }) {
  const { data: claims = [] } = usePatientClaims(patient.id);
  const { data: payments = [] } = usePatientPayments(patient.id);
  const { data: plans = [] } = usePatientPaymentPlans(patient.id);

  const insurance = Array.isArray(patient.insurance) ? (patient.insurance as any[]) : [];
  const address = patient.address as any;
  const totalOwed = claims
    .filter((c) => !["paid", "void"].includes(c.claim_status))
    .reduce((s, c) => s + Number(c.patient_responsibility), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-foreground">{patient.first_name} {patient.last_name}</h3>
        <p className="text-sm text-muted-foreground">MRN: {patient.mrn} · DOB: {patient.dob} · {patient.gender}</p>
        {address && <p className="text-xs text-muted-foreground mt-1">{address.line1}, {address.city}, {address.state} {address.zip}</p>}
        <p className="text-xs text-muted-foreground">{patient.phone} · {patient.email}</p>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Balance Owed</p>
            <p className="text-lg font-bold text-destructive">{formatCurrency(totalOwed)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Total Paid</p>
            <p className="text-lg font-bold text-success">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Active Plans</p>
            <p className="text-lg font-bold">{plans.filter(p => p.status === "active").length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={onCollectPayment} className="gap-1"><CreditCard className="h-3 w-3" /> Collect Payment</Button>
        <Button size="sm" variant="outline" onClick={onCreatePlan} className="gap-1"><Calendar className="h-3 w-3" /> Payment Plan</Button>
      </div>

      <Tabs defaultValue="insurance" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="insurance" className="flex-1 gap-1"><Shield className="h-3 w-3" /> Insurance</TabsTrigger>
          <TabsTrigger value="claims" className="flex-1 gap-1"><FileText className="h-3 w-3" /> Claims</TabsTrigger>
          <TabsTrigger value="payments" className="flex-1 gap-1"><DollarSign className="h-3 w-3" /> Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="insurance" className="space-y-3 pt-2">
          {insurance.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No insurance on file</p>
          ) : insurance.map((ins: any, i: number) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{ins.payer_name}</span>
                  <Badge variant="outline" className={cn("text-[10px] border",
                    ins.eligibility_status === "active" ? "bg-success/15 text-success border-success/30" : "bg-warning/15 text-warning border-warning/30"
                  )}>
                    {ins.eligibility_status || "Unknown"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span>Policy: <span className="font-mono text-foreground">{ins.policy_number}</span></span>
                  {ins.group_number && <span>Group: <span className="font-mono text-foreground">{ins.group_number}</span></span>}
                  <span>Coverage: <span className="capitalize text-foreground">{ins.coverage_type || "Primary"}</span></span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="claims" className="pt-2">
          {claims.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No claims</p>
          ) : (
            <div className="space-y-2">
              {claims.slice(0, 10).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border p-2.5">
                  <div>
                    <p className="text-xs font-mono font-medium">{c.claim_number}</p>
                    <p className="text-[10px] text-muted-foreground">{c.service_date} · {(c.payers as any)?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{formatCurrency(Number(c.total_charge_amount))}</span>
                    <Badge variant="outline" className={cn("text-[10px] border", getClaimStatusColor(c.claim_status))}>
                      {formatClaimStatus(c.claim_status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="pt-2">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No payments</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border p-2.5">
                  <div>
                    <p className="text-xs font-medium">{p.payment_date}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{p.payment_method} · {p.status}</p>
                  </div>
                  <span className="font-mono text-sm font-medium text-success">{formatCurrency(Number(p.amount))}</span>
                </div>
              ))}
            </div>
          )}

          {/* Payment plans */}
          {plans.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Payment Plans</h4>
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-md border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={cn("text-[10px]",
                      plan.status === "active" ? "bg-success/15 text-success border-success/30" : ""
                    )}>{plan.status}</Badge>
                    <span className="text-xs text-muted-foreground">{plan.payments_made}/{plan.number_of_payments} payments</span>
                  </div>
                  <p className="text-sm font-medium">{formatCurrency(Number(plan.monthly_amount))}/mo · Remaining: {formatCurrency(Number(plan.remaining_balance))}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PaymentDialog({ open, onClose, patientId }: { open: boolean; onClose: () => void; patientId: string }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("credit_card");
  const createPayment = useCreatePayment();

  const handleSubmit = async () => {
    if (!amount) return;
    try {
      await createPayment.mutateAsync({
        patient_id: patientId,
        amount: parseFloat(amount),
        payment_method: method,
        payment_date: new Date().toISOString().split("T")[0],
        status: "completed",
      });
      toast.success("Payment recorded");
      onClose();
      setAmount("");
    } catch {
      toast.error("Failed to record payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Collect Payment</DialogTitle>
          <DialogDescription>Record a patient payment</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="debit_card">Debit Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="hsa">HSA/FSA</SelectItem>
                <SelectItem value="apple_pay">Apple Pay</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} disabled={createPayment.isPending} className="w-full">
            {createPayment.isPending ? "Processing…" : "Record Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaymentPlanDialog({ open, onClose, patientId }: { open: boolean; onClose: () => void; patientId: string }) {
  const [balance, setBalance] = useState("");
  const [months, setMonths] = useState("3");
  const createPlan = useCreatePaymentPlan();

  const monthlyAmount = balance && months ? (parseFloat(balance) / parseInt(months)).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!balance) return;
    try {
      await createPlan.mutateAsync({
        patient_id: patientId,
        total_balance: parseFloat(balance),
        remaining_balance: parseFloat(balance),
        monthly_amount: parseFloat(monthlyAmount),
        number_of_payments: parseInt(months),
        start_date: new Date().toISOString().split("T")[0],
        status: "active",
      });
      toast.success("Payment plan created");
      onClose();
      setBalance("");
    } catch {
      toast.error("Failed to create plan");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Payment Plan</DialogTitle>
          <DialogDescription>Set up an installment plan</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Total Balance</Label>
            <Input type="number" placeholder="0.00" value={balance} onChange={(e) => setBalance(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Number of Payments</Label>
            <Select value={months} onValueChange={setMonths}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[3, 6, 9, 12].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} months</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border p-3 text-center">
            <p className="text-xs text-muted-foreground">Monthly Payment</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(parseFloat(monthlyAmount) || 0)}</p>
            <p className="text-[10px] text-muted-foreground">0% interest</p>
          </div>
          <Button onClick={handleSubmit} disabled={createPlan.isPending} className="w-full">
            {createPlan.isPending ? "Creating…" : "Create Plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
