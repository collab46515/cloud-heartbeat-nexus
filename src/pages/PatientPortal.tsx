import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet, CreditCard, FileText, MessageSquare, Clock, DollarSign,
  Loader2, CheckCircle, Send, User, Phone, Mail, Shield,
  Receipt, TrendingDown, Calendar, ArrowRight, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

function usePortalPatients() {
  return useQuery({
    queryKey: ["portal-patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("is_active", true)
        .order("last_name")
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}

function usePortalClaims(patientId: string | null) {
  return useQuery({
    queryKey: ["portal-claims", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("*, payers(name)")
        .eq("patient_id", patientId!)
        .order("service_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

function usePortalPayments(patientId: string | null) {
  return useQuery({
    queryKey: ["portal-payments", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_payments")
        .select("*, claims(claim_number)")
        .eq("patient_id", patientId!)
        .order("payment_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

function usePortalPlans(patientId: string | null) {
  return useQuery({
    queryKey: ["portal-plans", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_payment_plans")
        .select("*, claims(claim_number)")
        .eq("patient_id", patientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function usePortalMessages(patientId: string | null) {
  return useQuery({
    queryKey: ["portal-messages", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_portal_messages")
        .select("*")
        .eq("patient_id", patientId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });
}

function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (msg: { patient_id: string; subject: string; message: string }) => {
      const { error } = await supabase.from("patient_portal_messages").insert({
        ...msg,
        direction: "outbound",
        status: "sent",
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["portal-messages", vars.patient_id] });
      toast.success("Message sent");
    },
  });
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-primary/15 text-primary border-primary/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  paid: "bg-success/15 text-success border-success/30",
  partial_paid: "bg-info/15 text-info border-info/30",
  denied: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function PatientPortal() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);
  const [msgForm, setMsgForm] = useState({ subject: "", message: "" });
  const sendMessage = useSendMessage();

  const { data: patients = [], isLoading: loadingPatients } = usePortalPatients();
  const { data: claims = [] } = usePortalClaims(selectedPatientId);
  const { data: payments = [] } = usePortalPayments(selectedPatientId);
  const { data: plans = [] } = usePortalPlans(selectedPatientId);
  const { data: messages = [] } = usePortalMessages(selectedPatientId);

  const selectedPatient = patients.find((p: any) => p.id === selectedPatientId);

  const totalOwed = claims.reduce((s: number, c: any) => s + Math.max(0, Number(c.patient_responsibility) - Number(c.total_paid_amount)), 0);
  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const activePlans = plans.filter((p: any) => p.status === "active");

  const handleSendMessage = async () => {
    if (!selectedPatientId || !msgForm.subject || !msgForm.message) return;
    await sendMessage.mutateAsync({ patient_id: selectedPatientId, ...msgForm });
    setMsgDialogOpen(false);
    setMsgForm({ subject: "", message: "" });
  };

  return (
    <div className="page-animate-in space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Patient Portal</h1>
          <p className="text-sm text-muted-foreground">Self-service billing, statements, payment history, and secure messaging.</p>
        </div>
      </div>

      {/* Patient Selector */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Select Patient</Label>
              <Select value={selectedPatientId || ""} onValueChange={setSelectedPatientId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Search and select a patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.last_name}, {p.first_name} — MRN: {p.mrn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedPatientId ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <User className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select a patient to view their portal</p>
            <p className="text-xs text-muted-foreground/70 mt-1">View statements, make payments, manage plans, and send messages.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Patient Header */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-6 p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {selectedPatient?.first_name?.[0]}{selectedPatient?.last_name?.[0]}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground">{selectedPatient?.first_name} {selectedPatient?.last_name}</h2>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> MRN: {selectedPatient?.mrn}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> DOB: {selectedPatient?.dob ? format(new Date(selectedPatient.dob), "MM/dd/yyyy") : "—"}</span>
                  {selectedPatient?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {selectedPatient.phone}</span>}
                  {selectedPatient?.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {selectedPatient.email}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Dialog open={msgDialogOpen} onOpenChange={setMsgDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <MessageSquare className="h-3.5 w-3.5" /> Send Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Message to {selectedPatient?.first_name} {selectedPatient?.last_name}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Subject</Label><Input value={msgForm.subject} onChange={(e) => setMsgForm((f) => ({ ...f, subject: e.target.value }))} placeholder="e.g. Payment reminder" /></div>
                      <div><Label>Message</Label><Textarea value={msgForm.message} onChange={(e) => setMsgForm((f) => ({ ...f, message: e.target.value }))} rows={4} placeholder="Enter message..." /></div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSendMessage} disabled={sendMessage.isPending} className="gap-1">
                        {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Balance Due</p>
                <p className="mt-1 text-2xl font-bold text-destructive">${totalOwed.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Paid</p>
                <p className="mt-1 text-2xl font-bold text-success">${totalPaid.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Plans</p>
                <p className="mt-1 text-2xl font-bold">{activePlans.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Claims</p>
                <p className="mt-1 text-2xl font-bold">{claims.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="statements" className="w-full">
            <TabsList>
              <TabsTrigger value="statements" className="gap-1"><FileText className="h-3 w-3" /> Statements</TabsTrigger>
              <TabsTrigger value="payments" className="gap-1"><DollarSign className="h-3 w-3" /> Payments</TabsTrigger>
              <TabsTrigger value="plans" className="gap-1"><Wallet className="h-3 w-3" /> Payment Plans</TabsTrigger>
              <TabsTrigger value="messages" className="gap-1"><MessageSquare className="h-3 w-3" /> Messages</TabsTrigger>
            </TabsList>

            {/* Statements Tab */}
            <TabsContent value="statements" className="pt-4">
              {claims.length === 0 ? (
                <Card className="border-border/60">
                  <CardContent className="p-8 text-center">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">No statements</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Date</TableHead>
                        <TableHead>Claim #</TableHead>
                        <TableHead>Payer</TableHead>
                        <TableHead>Total Charges</TableHead>
                        <TableHead>Insurance Paid</TableHead>
                        <TableHead>Your Responsibility</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {claims.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm">{c.service_date ? format(new Date(c.service_date), "MM/dd/yyyy") : "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{c.claim_number}</TableCell>
                          <TableCell className="text-sm">{(c as any).payers?.name || "—"}</TableCell>
                          <TableCell className="text-sm font-medium">${Number(c.total_charge_amount).toFixed(2)}</TableCell>
                          <TableCell className="text-sm">${Number(c.total_paid_amount).toFixed(2)}</TableCell>
                          <TableCell className="text-sm font-bold">${Number(c.patient_responsibility).toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusColors[c.claim_status] || "")}>
                              {c.claim_status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="pt-4">
              {payments.length === 0 ? (
                <Card className="border-border/60">
                  <CardContent className="p-8 text-center">
                    <DollarSign className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">No payment history</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Claim</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Transaction ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{format(new Date(p.payment_date), "MM/dd/yyyy")}</TableCell>
                          <TableCell className="text-sm font-bold text-success">${Number(p.amount).toFixed(2)}</TableCell>
                          <TableCell className="text-sm capitalize">{p.payment_method?.replace(/_/g, " ")}</TableCell>
                          <TableCell className="font-mono text-xs">{(p as any).claims?.claim_number || "—"}</TableCell>
                          <TableCell>
                            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              p.status === "completed" ? "bg-success/15 text-success border-success/30" : "bg-warning/15 text-warning border-warning/30"
                            )}>
                              {p.status}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{p.transaction_id || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Payment Plans Tab */}
            <TabsContent value="plans" className="pt-4">
              {plans.length === 0 ? (
                <Card className="border-border/60">
                  <CardContent className="p-8 text-center">
                    <Wallet className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">No payment plans</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {plans.map((plan: any) => {
                    const progress = plan.number_of_payments > 0
                      ? ((plan.payments_made || 0) / plan.number_of_payments) * 100
                      : 0;
                    return (
                      <Card key={plan.id} className="border-border/60">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">${Number(plan.monthly_amount).toFixed(2)}/month × {plan.number_of_payments} payments</p>
                              <p className="text-xs text-muted-foreground">
                                Claim: {(plan as any).claims?.claim_number || "—"} • Started {format(new Date(plan.start_date), "MM/dd/yyyy")}
                              </p>
                            </div>
                            <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold",
                              plan.status === "active" ? "bg-success/15 text-success border-success/30" :
                              plan.status === "completed" ? "bg-primary/15 text-primary border-primary/30" :
                              "bg-muted text-muted-foreground"
                            )}>
                              {plan.status}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{plan.payments_made || 0} of {plan.number_of_payments} payments made</span>
                              <span className="font-medium">${Number(plan.remaining_balance).toFixed(2)} remaining</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                          {plan.next_payment_date && plan.status === "active" && (
                            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" /> Next payment: {format(new Date(plan.next_payment_date), "MMM d, yyyy")}
                              {plan.auto_pay && <span className="ml-2 inline-flex items-center gap-1 text-success"><CheckCircle className="h-3 w-3" /> Auto-pay</span>}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages" className="pt-4">
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <Card className="border-border/60">
                    <CardContent className="p-8 text-center">
                      <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm font-medium text-muted-foreground">No messages</p>
                      <p className="text-xs text-muted-foreground/70">Send a message to start a conversation.</p>
                    </CardContent>
                  </Card>
                ) : (
                  messages.map((m: any) => (
                    <Card key={m.id} className={cn("border-border/60", m.direction === "inbound" && m.status === "unread" && "border-primary/30 bg-primary/5")}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              m.direction === "inbound" ? "bg-info/15 text-info border-info/30" : "bg-muted text-muted-foreground"
                            )}>
                              {m.direction === "inbound" ? "From Patient" : "To Patient"}
                            </span>
                            <span className="text-xs text-muted-foreground">{format(new Date(m.created_at), "MMM d, yyyy h:mm a")}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{m.subject}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{m.message}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
