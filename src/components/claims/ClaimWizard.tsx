import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePatients } from "@/hooks/usePatients";
import { usePayers, useCreateClaim } from "@/hooks/useClaims";
import { useRunScrub } from "@/hooks/useScrubbing";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ChevronRight, ChevronLeft, Search, User, Building2, Plus, Trash2,
  Loader2, Brain, Shield, Check, AlertTriangle, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LineItem {
  procedure_code: string;
  procedure_description: string;
  modifiers: string[];
  units: number;
  charge_amount: number;
  service_date: string;
  diagnosis_pointer: string;
}

interface DiagnosisEntry {
  code: string;
  description: string;
}

const STEPS = ["Patient & Payer", "Diagnoses & Procedures", "Review & Submit"] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClaimWizard({ open, onOpenChange }: Props) {
  const [step, setStep] = useState(0);

  // Step 1 state
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPayerId, setSelectedPayerId] = useState<string | null>(null);
  const [claimType, setClaimType] = useState<"professional" | "institutional">("professional");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [facilityName, setFacilityName] = useState("");

  // Step 2 state
  const [diagnoses, setDiagnoses] = useState<DiagnosisEntry[]>([{ code: "", description: "" }]);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { procedure_code: "", procedure_description: "", modifiers: [], units: 1, charge_amount: 0, service_date: new Date().toISOString().slice(0, 10), diagnosis_pointer: "1" },
  ]);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  // Step 3 state
  const [scrubResult, setScrubResult] = useState<any>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: patients = [] } = usePatients(patientSearch);
  const { data: payers = [] } = usePayers();
  const createClaim = useCreateClaim();

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId),
    [patients, selectedPatientId]
  );
  const selectedPayer = useMemo(
    () => payers.find((p) => p.id === selectedPayerId),
    [payers, selectedPayerId]
  );

  const totalCharges = lineItems.reduce((s, li) => s + li.charge_amount * li.units, 0);

  const canProceedStep0 = selectedPatientId && selectedPayerId && serviceDate;
  const canProceedStep1 = diagnoses.some((d) => d.code.trim()) && lineItems.some((li) => li.procedure_code.trim() && li.charge_amount > 0);

  const resetWizard = () => {
    setStep(0);
    setPatientSearch("");
    setSelectedPatientId(null);
    setSelectedPayerId(null);
    setClaimType("professional");
    setServiceDate(new Date().toISOString().slice(0, 10));
    setFacilityName("");
    setDiagnoses([{ code: "", description: "" }]);
    setLineItems([{ procedure_code: "", procedure_description: "", modifiers: [], units: 1, charge_amount: 0, service_date: new Date().toISOString().slice(0, 10), diagnosis_pointer: "1" }]);
    setAiSuggestions([]);
    setScrubResult(null);
  };

  const handleClose = (val: boolean) => {
    if (!val) resetWizard();
    onOpenChange(val);
  };

  const fetchAISuggestions = async () => {
    if (!diagnoses.some((d) => d.code.trim()) || !lineItems.some((li) => li.procedure_code.trim())) return;
    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-coding-suggestions", {
        body: {
          diagnoses: diagnoses.filter((d) => d.code.trim()),
          procedures: lineItems.filter((li) => li.procedure_code.trim()).map((li) => ({
            code: li.procedure_code,
            description: li.procedure_description,
            modifiers: li.modifiers,
          })),
          claim_type: claimType,
        },
      });
      if (error) throw error;
      setAiSuggestions(data?.suggestions || []);
    } catch {
      // silently fail AI suggestions
    } finally {
      setLoadingAI(false);
    }
  };

  const handleRunScrub = async () => {
    setScrubbing(true);
    setScrubResult(null);
    try {
      // Create a temporary claim to scrub
      const { data, error } = await supabase.functions.invoke("scrub-claim", {
        body: {
          claim_type: claimType,
          diagnoses: diagnoses.filter((d) => d.code.trim()).map((d, i) => ({
            code: d.code,
            description: d.description,
            rank: i === 0 ? "primary" : "secondary",
          })),
          line_items: lineItems.filter((li) => li.procedure_code.trim()).map((li) => ({
            procedure_code: li.procedure_code,
            modifiers: li.modifiers,
            units: li.units,
            charge_amount: li.charge_amount,
            service_date: li.service_date,
          })),
          payer_id: selectedPayerId,
        },
      });
      if (error) throw error;
      setScrubResult(data);
    } catch (err: any) {
      setScrubResult({ scrub_status: "error", findings: [], total_findings: 0, errors: 1 });
    } finally {
      setScrubbing(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatientId || !selectedPayerId) return;
    setSubmitting(true);
    try {
      const validDiagnoses = diagnoses.filter((d) => d.code.trim());
      const validLineItems = lineItems.filter((li) => li.procedure_code.trim() && li.charge_amount > 0);

      await createClaim.mutateAsync({
        patient_id: selectedPatientId,
        payer_id: selectedPayerId,
        claim_type: claimType,
        claim_number: "", // auto-generated by trigger
        service_date: serviceDate,
        facility_name: facilityName || null,
        total_charge_amount: totalCharges,
        diagnoses: validDiagnoses.map((d, i) => ({
          code: d.code,
          description: d.description,
          rank: i === 0 ? "primary" : "secondary",
          present_on_admission: true,
        })),
        claim_status: "draft",
        line_items: validLineItems.map((li) => ({
          procedure_code: li.procedure_code,
          procedure_description: li.procedure_description,
          modifiers: li.modifiers,
          units: li.units,
          charge_amount: li.charge_amount,
          service_date: li.service_date || serviceDate,
          diagnosis_pointer: li.diagnosis_pointer,
          claim_id: "", // will be set by mutation
        })),
      });

      toast.success("Claim created successfully");
      handleClose(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create claim");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">New Claim</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={cn(
                "flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold transition-colors",
                i < step ? "bg-primary text-primary-foreground" :
                i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30" :
                "bg-muted text-muted-foreground"
              )}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn("text-xs font-medium hidden sm:inline", i === step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              {i < STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <Separator />

        {/* Step 1: Patient & Payer */}
        {step === 0 && (
          <div className="space-y-4 pt-4">
            {/* Patient selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Patient</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or MRN…"
                  className="pl-9 h-9 text-sm"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
              </div>
              {patientSearch && !selectedPatientId && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {patients.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPatientId(p.id); setPatientSearch(""); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                    >
                      <span className="font-medium">{p.last_name}, {p.first_name}</span>
                      <span className="text-xs text-muted-foreground">MRN: {p.mrn}</span>
                      <span className="text-xs text-muted-foreground ml-auto">DOB: {p.dob}</span>
                    </button>
                  ))}
                  {patients.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No patients found</p>}
                </div>
              )}
              {selectedPatient && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{selectedPatient.last_name}, {selectedPatient.first_name}</p>
                      <p className="text-xs text-muted-foreground">MRN: {selectedPatient.mrn} · DOB: {selectedPatient.dob}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPatientId(null)}>Change</Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Payer */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Payer</Label>
              <Select value={selectedPayerId || ""} onValueChange={setSelectedPayerId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select a payer…" /></SelectTrigger>
                <SelectContent>
                  {payers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.payer_type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Claim type, date, facility */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Claim Type</Label>
                <Select value={claimType} onValueChange={(v) => setClaimType(v as any)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="institutional">Institutional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Service Date</Label>
                <Input type="date" className="h-9 text-sm" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Facility</Label>
                <Input className="h-9 text-sm" placeholder="Optional" value={facilityName} onChange={(e) => setFacilityName(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Diagnoses & Procedures */}
        {step === 1 && (
          <div className="space-y-5 pt-4">
            {/* Diagnoses */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Diagnoses (ICD-10)</Label>
              {diagnoses.map((dx, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="outline" className="shrink-0 text-[10px] w-6 h-6 flex items-center justify-center">{i + 1}</Badge>
                  <Input className="h-8 text-sm w-28" placeholder="Code" value={dx.code} onChange={(e) => {
                    const next = [...diagnoses]; next[i] = { ...dx, code: e.target.value.toUpperCase() }; setDiagnoses(next);
                  }} />
                  <Input className="h-8 text-sm flex-1" placeholder="Description" value={dx.description} onChange={(e) => {
                    const next = [...diagnoses]; next[i] = { ...dx, description: e.target.value }; setDiagnoses(next);
                  }} />
                  {diagnoses.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDiagnoses(diagnoses.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setDiagnoses([...diagnoses, { code: "", description: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> Add Diagnosis
              </Button>
            </div>

            <Separator />

            {/* Procedures */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Procedures (CPT/HCPCS)</Label>
              {lineItems.map((li, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-2 h-8 text-sm" placeholder="CPT" value={li.procedure_code} onChange={(e) => {
                    const next = [...lineItems]; next[i] = { ...li, procedure_code: e.target.value }; setLineItems(next);
                  }} />
                  <Input className="col-span-4 h-8 text-sm" placeholder="Description" value={li.procedure_description} onChange={(e) => {
                    const next = [...lineItems]; next[i] = { ...li, procedure_description: e.target.value }; setLineItems(next);
                  }} />
                  <Input className="col-span-1 h-8 text-sm text-center" type="number" min={1} placeholder="Qty" value={li.units} onChange={(e) => {
                    const next = [...lineItems]; next[i] = { ...li, units: parseInt(e.target.value) || 1 }; setLineItems(next);
                  }} />
                  <Input className="col-span-2 h-8 text-sm" type="number" step="0.01" min={0} placeholder="Charge" value={li.charge_amount || ""} onChange={(e) => {
                    const next = [...lineItems]; next[i] = { ...li, charge_amount: parseFloat(e.target.value) || 0 }; setLineItems(next);
                  }} />
                  <Input className="col-span-2 h-8 text-sm" placeholder="Dx Ptr" value={li.diagnosis_pointer} onChange={(e) => {
                    const next = [...lineItems]; next[i] = { ...li, diagnosis_pointer: e.target.value }; setLineItems(next);
                  }} />
                  <div className="col-span-1 flex justify-center">
                    {lineItems.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLineItems(lineItems.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setLineItems([...lineItems, {
                  procedure_code: "", procedure_description: "", modifiers: [], units: 1, charge_amount: 0,
                  service_date: serviceDate, diagnosis_pointer: "1",
                }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add Procedure
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={fetchAISuggestions} disabled={loadingAI}>
                  {loadingAI ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Brain className="h-3 w-3 mr-1" />}
                  AI Code Check
                </Button>
              </div>
            </div>

            {/* AI Suggestions */}
            {aiSuggestions.length > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 space-y-2">
                  <p className="text-xs font-semibold flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI Coding Suggestions</p>
                  {aiSuggestions.map((s: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Badge variant="outline" className="shrink-0 text-[10px]">{s.type || "tip"}</Badge>
                      <span>{s.message || s.suggestion || JSON.stringify(s)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="text-right">
              <span className="text-sm font-semibold">Total: ${totalCharges.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 2 && (
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Patient</p>
                  <p className="text-sm font-semibold">{selectedPatient?.last_name}, {selectedPatient?.first_name}</p>
                  <p className="text-xs text-muted-foreground">MRN: {selectedPatient?.mrn}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Payer</p>
                  <p className="text-sm font-semibold">{selectedPayer?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{selectedPayer?.payer_type} · {claimType}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-3">
                <p className="text-xs font-semibold mb-2">Diagnoses</p>
                <div className="flex flex-wrap gap-1.5">
                  {diagnoses.filter((d) => d.code.trim()).map((d, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{d.code} — {d.description || "No desc"}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <p className="text-xs font-semibold mb-2">Procedures ({lineItems.filter((li) => li.procedure_code.trim()).length} items)</p>
                <div className="space-y-1">
                  {lineItems.filter((li) => li.procedure_code.trim()).map((li, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="font-mono">{li.procedure_code} — {li.procedure_description || "N/A"} × {li.units}</span>
                      <span className="font-semibold">${(li.charge_amount * li.units).toFixed(2)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between text-sm font-bold">
                    <span>Total Charges</span>
                    <span>${totalCharges.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scrub result */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRunScrub} disabled={scrubbing}>
                {scrubbing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Shield className="h-3.5 w-3.5 mr-1" />}
                Pre-Submit Scrub
              </Button>
              {scrubResult && (
                <Badge variant="outline" className={cn("text-xs",
                  scrubResult.scrub_status === "passed" ? "bg-emerald-500/15 text-emerald-600 border-emerald-200" :
                  scrubResult.scrub_status === "warnings" ? "bg-amber-500/15 text-amber-600 border-amber-200" :
                  "bg-destructive/15 text-destructive border-destructive/30"
                )}>
                  {scrubResult.scrub_status === "passed" ? <Check className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                  {scrubResult.scrub_status} — {scrubResult.total_findings || 0} findings
                </Badge>
              )}
            </div>

            {scrubResult?.findings?.length > 0 && (
              <Card className="border-amber-200 bg-amber-500/5">
                <CardContent className="p-3 space-y-1">
                  {scrubResult.findings.map((f: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Badge variant="outline" className={cn("text-[10px] shrink-0",
                        f.severity === "error" ? "text-destructive" : "text-amber-600"
                      )}>{f.severity}</Badge>
                      <span>{f.message || f.description}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Separator />

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={() => step > 0 ? setStep(step - 1) : handleClose(false)}>
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            {step > 0 ? "Back" : "Cancel"}
          </Button>

          {step < 2 ? (
            <Button size="sm" disabled={step === 0 ? !canProceedStep0 : !canProceedStep1}
              onClick={() => { setStep(step + 1); if (step === 1) fetchAISuggestions(); }}>
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
              Create Claim
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
