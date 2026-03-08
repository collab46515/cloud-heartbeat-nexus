import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Receipt, Plus, Loader2, Search, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function useEncounters() {
  return useQuery({
    queryKey: ["encounters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("encounters")
        .select("*, patients(first_name, last_name, mrn), providers:attending_provider_id(first_name, last_name, specialty)")
        .order("admission_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

function useCreateEncounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enc: { patient_id: string; visit_type: "inpatient" | "outpatient" | "ed" | "observation"; admission_date: string; facility_name?: string; attending_provider_id?: string }) => {
      const { error } = await supabase.from("encounters").insert([enc]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["encounters"] });
      toast.success("Encounter created");
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

function useProvidersList() {
  return useQuery({
    queryKey: ["providers-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("providers").select("id, first_name, last_name, specialty").eq("is_active", true).order("last_name");
      if (error) throw error;
      return data;
    },
  });
}

function useCreateClaimFromEncounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (encounter: any) => {
      // Need a payer_id - get from patient's first claim or skip
      const { data: existingClaim } = await supabase.from("claims").select("payer_id").eq("patient_id", encounter.patient_id).limit(1).single();
      const { data: firstPayer } = await supabase.from("payers").select("id").limit(1).single();
      const payerId = existingClaim?.payer_id || firstPayer?.id;
      if (!payerId) throw new Error("No payer available");
      
      const { error } = await supabase.from("claims").insert([{
        claim_number: `CLM-${Date.now()}`,
        patient_id: encounter.patient_id,
        payer_id: payerId,
        encounter_id: encounter.id,
        service_date: encounter.admission_date,
        claim_type: encounter.visit_type === "inpatient" ? "institutional" as const : "professional" as const,
        facility_name: encounter.facility_name,
        provider_id: encounter.attending_provider_id,
        total_charge_amount: Number(encounter.total_charges) || 0,
      }]);
      if (error) throw error;
      await supabase.from("encounters").update({ status: "billed" }).eq("id", encounter.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["encounters"] });
      qc.invalidateQueries({ queryKey: ["claims"] });
      toast.success("Claim created from encounter");
    },
  });
}

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  discharged: "bg-info/15 text-info border-info/30",
  billed: "bg-primary/15 text-primary border-primary/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function ChargeCapture() {
  const { data: encounters = [], isLoading } = useEncounters();
  const { data: patients = [] } = usePatientsList();
  const { data: providers = [] } = useProvidersList();
  const createEncounter = useCreateEncounter();
  const createClaim = useCreateClaimFromEncounter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ patient_id: "", visit_type: "outpatient", admission_date: "", facility_name: "", attending_provider_id: "" });
  const [search, setSearch] = useState("");

  const activeEnc = encounters.filter((e: any) => e.status === "active").length;
  const billedEnc = encounters.filter((e: any) => e.status === "billed").length;
  const totalCharges = encounters.reduce((s: number, e: any) => s + (Number(e.total_charges) || 0), 0);

  const handleCreate = async () => {
    if (!form.patient_id || !form.admission_date) return;
    try {
      await createEncounter.mutateAsync({
        patient_id: form.patient_id,
        visit_type: form.visit_type as any,
        admission_date: form.admission_date,
        facility_name: form.facility_name || undefined,
        attending_provider_id: form.attending_provider_id || undefined,
      });
      setDialogOpen(false);
      setForm({ patient_id: "", visit_type: "outpatient", admission_date: "", facility_name: "", attending_provider_id: "" });
    } catch { toast.error("Failed to create encounter"); }
  };

  const filtered = encounters.filter((e: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      e.patients?.first_name?.toLowerCase().includes(s) ||
      e.patients?.last_name?.toLowerCase().includes(s) ||
      e.patients?.mrn?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Charge Capture</h1>
          <p className="text-sm text-muted-foreground">Encounter management, charge entry, and claim generation workflow.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="gap-1"><Plus className="h-4 w-4" /> New Encounter</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Encounter</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Patient</Label>
                <Select value={form.patient_id} onValueChange={v => setForm(f => ({ ...f, patient_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.last_name}, {p.first_name} ({p.mrn})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Visit Type</Label>
                  <Select value={form.visit_type} onValueChange={v => setForm(f => ({ ...f, visit_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outpatient">Outpatient</SelectItem>
                      <SelectItem value="inpatient">Inpatient</SelectItem>
                      <SelectItem value="ed">Emergency</SelectItem>
                      <SelectItem value="observation">Observation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Admission Date</Label><Input type="date" value={form.admission_date} onChange={e => setForm(f => ({ ...f, admission_date: e.target.value }))} /></div>
              </div>
              <div><Label>Facility</Label><Input value={form.facility_name} onChange={e => setForm(f => ({ ...f, facility_name: e.target.value }))} placeholder="e.g. Main Hospital" /></div>
              <div>
                <Label>Attending Provider</Label>
                <Select value={form.attending_provider_id} onValueChange={v => setForm(f => ({ ...f, attending_provider_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                  <SelectContent>{providers.map((p: any) => <SelectItem key={p.id} value={p.id}>Dr. {p.last_name}, {p.first_name} — {p.specialty}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate} disabled={createEncounter.isPending}>{createEncounter.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Encounters</p><p className="mt-1 text-2xl font-bold">{encounters.length}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active</p><p className="mt-1 text-2xl font-bold text-success">{activeEnc}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Billed</p><p className="mt-1 text-2xl font-bold text-primary">{billedEnc}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Charges</p><p className="mt-1 text-2xl font-bold">${totalCharges.toLocaleString("en", { minimumFractionDigits: 2 })}</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Search encounters..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60"><CardContent className="p-8 text-center">
          <Receipt className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No encounters found</p>
          <p className="text-xs text-muted-foreground">Create encounters to begin charge capture.</p>
        </CardContent></Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Patient</TableHead>
                <TableHead>MRN</TableHead>
                <TableHead>Visit Type</TableHead>
                <TableHead>Admission</TableHead>
                <TableHead>Discharge</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Charges</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium text-sm">{e.patients?.first_name} {e.patients?.last_name}</TableCell>
                  <TableCell className="text-sm font-mono">{e.patients?.mrn}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] capitalize">{e.visit_type}</Badge></TableCell>
                  <TableCell className="text-sm">{new Date(e.admission_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm">{e.discharge_date ? new Date(e.discharge_date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-sm">{e.providers ? `Dr. ${e.providers.last_name}` : "—"}</TableCell>
                  <TableCell className="text-sm font-medium">${(Number(e.total_charges) || 0).toFixed(2)}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px] border", statusColors[e.status] || "")}>{e.status}</Badge></TableCell>
                  <TableCell>
                    {e.status !== "billed" && e.status !== "cancelled" && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => createClaim.mutate(e)} disabled={createClaim.isPending}>
                        <ArrowRight className="h-3 w-3" /> Bill
                      </Button>
                    )}
                    {e.status === "billed" && <CheckCircle className="h-4 w-4 text-success" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
