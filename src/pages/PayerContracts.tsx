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
import { Handshake, Plus, Loader2, CheckCircle, Clock, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function useContracts() {
  return useQuery({
    queryKey: ["payer-contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payer_contracts")
        .select("*, payers(name, payer_type)")
        .order("effective_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useFeeSchedules(contractId?: string) {
  return useQuery({
    queryKey: ["fee-schedules", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_schedules")
        .select("*")
        .eq("contract_id", contractId!)
        .order("procedure_code");
      if (error) throw error;
      return data;
    },
    enabled: !!contractId,
  });
}

function usePayers() {
  return useQuery({
    queryKey: ["payers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payers").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });
}

function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contract: { payer_id: string; contract_name: string; contract_type: string; effective_date: string; timely_filing_days: number }) => {
      const { error } = await supabase.from("payer_contracts").insert(contract);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payer-contracts"] });
      toast.success("Contract created");
    },
  });
}

export default function PayerContracts() {
  const { data: contracts = [], isLoading } = useContracts();
  const { data: payers = [] } = usePayers();
  const createContract = useCreateContract();
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const { data: feeSchedules = [], isLoading: loadingFees } = useFeeSchedules(selectedContract || undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ payer_id: "", contract_name: "", contract_type: "fee_for_service", effective_date: "", timely_filing_days: "90" });
  const [search, setSearch] = useState("");

  const activeContracts = contracts.filter((c: any) => c.is_active);
  const totalPayers = new Set(contracts.map((c: any) => c.payer_id)).size;

  const handleCreate = async () => {
    if (!form.payer_id || !form.contract_name || !form.effective_date) return;
    try {
      await createContract.mutateAsync({ ...form, timely_filing_days: parseInt(form.timely_filing_days) });
      setDialogOpen(false);
      setForm({ payer_id: "", contract_name: "", contract_type: "fee_for_service", effective_date: "", timely_filing_days: "90" });
    } catch { toast.error("Failed to create contract"); }
  };

  const filtered = contracts.filter((c: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.contract_name.toLowerCase().includes(s) || c.payers?.name?.toLowerCase().includes(s);
  });

  return (
    <div className="page-animate-in space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Payer Contracts</h1>
          <p className="text-sm text-muted-foreground">Contract management, fee schedules, and reimbursement modeling.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="gap-1"><Plus className="h-4 w-4" /> New Contract</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Payer Contract</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Payer</Label>
                <Select value={form.payer_id} onValueChange={v => setForm(f => ({ ...f, payer_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select payer" /></SelectTrigger>
                  <SelectContent>{payers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Contract Name</Label><Input value={form.contract_name} onChange={e => setForm(f => ({ ...f, contract_name: e.target.value }))} placeholder="e.g. Blue Cross PPO 2025" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.contract_type} onValueChange={v => setForm(f => ({ ...f, contract_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fee_for_service">Fee for Service</SelectItem>
                      <SelectItem value="capitation">Capitation</SelectItem>
                      <SelectItem value="value_based">Value-Based</SelectItem>
                      <SelectItem value="percent_of_charge">% of Charge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Effective Date</Label><Input type="date" value={form.effective_date} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} /></div>
              </div>
              <div><Label>Timely Filing (days)</Label><Input type="number" value={form.timely_filing_days} onChange={e => setForm(f => ({ ...f, timely_filing_days: e.target.value }))} /></div>
            </div>
            <DialogFooter><Button onClick={handleCreate} disabled={createContract.isPending}>{createContract.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Contracts</p><p className="mt-1 text-2xl font-bold">{contracts.length}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active</p><p className="mt-1 text-2xl font-bold text-success">{activeContracts.length}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payers</p><p className="mt-1 text-2xl font-bold text-primary">{totalPayers}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fee Schedules</p><p className="mt-1 text-2xl font-bold">{selectedContract ? feeSchedules.length : "—"}</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Search contracts..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60"><CardContent className="p-8 text-center">
          <Handshake className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No contracts found</p>
          <p className="text-xs text-muted-foreground">Create payer contracts to manage reimbursement terms.</p>
        </CardContent></Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Contract</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Filing Days</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => (
                <TableRow key={c.id} className={cn(selectedContract === c.id && "bg-primary/5")}>
                  <TableCell className="font-medium text-sm">{c.contract_name}</TableCell>
                  <TableCell className="text-sm">{c.payers?.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] capitalize">{c.contract_type.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-sm">{new Date(c.effective_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm">{c.timely_filing_days}d</TableCell>
                  <TableCell>{c.is_active ? <CheckCircle className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4 text-muted-foreground" />}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedContract(selectedContract === c.id ? null : c.id)}>Fees</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedContract && (
        <Card>
          <CardHeader><CardTitle className="text-base">Fee Schedule</CardTitle></CardHeader>
          <CardContent>
            {loadingFees ? <Loader2 className="h-5 w-5 animate-spin" /> : feeSchedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fee schedules configured for this contract.</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader><TableRow className="bg-muted/40">
                    <TableHead>CPT</TableHead><TableHead>Modifier</TableHead><TableHead>Allowed</TableHead><TableHead>Facility</TableHead><TableHead>Non-Facility</TableHead><TableHead>Effective</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {feeSchedules.map((f: any) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-sm">{f.procedure_code}</TableCell>
                        <TableCell className="text-sm">{f.modifier || "—"}</TableCell>
                        <TableCell className="text-sm font-medium">${Number(f.allowed_amount).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">{f.facility_rate ? `$${Number(f.facility_rate).toFixed(2)}` : "—"}</TableCell>
                        <TableCell className="text-sm">{f.non_facility_rate ? `$${Number(f.non_facility_rate).toFixed(2)}` : "—"}</TableCell>
                        <TableCell className="text-sm">{new Date(f.effective_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
