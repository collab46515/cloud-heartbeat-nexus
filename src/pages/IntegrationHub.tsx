import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Network, CheckCircle, XCircle, Loader2, RefreshCw, Plug, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function useIntegrationConfigs() {
  return useQuery({
    queryKey: ["integration-configs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("integration_configs").select("*").order("integration_type", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

function useSeedIntegrations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const configs = [
        { integration_name: "Epic EHR", integration_type: "ehr", vendor: "Epic Systems", status: "active", connection_method: "fhir", endpoint_url: "https://fhir.epic.com/r4", sync_frequency: "realtime", records_synced: 12450 },
        { integration_name: "Cerner/Oracle Health", integration_type: "ehr", vendor: "Oracle", status: "active", connection_method: "fhir", endpoint_url: "https://fhir.cerner.com/r4", sync_frequency: "realtime", records_synced: 8320 },
        { integration_name: "Allscripts Veradigm", integration_type: "ehr", vendor: "Veradigm", status: "inactive", connection_method: "hl7", sync_frequency: "hourly", records_synced: 0 },
        { integration_name: "Availity Clearinghouse", integration_type: "clearinghouse", vendor: "Availity", status: "active", connection_method: "edi", endpoint_url: "https://api.availity.com/v1", sync_frequency: "realtime", records_synced: 45200 },
        { integration_name: "Change Healthcare", integration_type: "clearinghouse", vendor: "Change Healthcare", status: "active", connection_method: "edi", endpoint_url: "https://api.changehealthcare.com", sync_frequency: "daily", records_synced: 22100 },
        { integration_name: "Trizetto Gateway", integration_type: "clearinghouse", vendor: "Trizetto", status: "inactive", connection_method: "sftp", sync_frequency: "daily", records_synced: 0 },
        { integration_name: "Medicare DDE Portal", integration_type: "payer_portal", vendor: "CMS", status: "active", connection_method: "api", endpoint_url: "https://portal.cms.gov", sync_frequency: "daily", records_synced: 5600 },
        { integration_name: "BCBS Provider Portal", integration_type: "payer_portal", vendor: "BCBS", status: "active", connection_method: "api", sync_frequency: "daily", records_synced: 3200 },
        { integration_name: "Stripe Payments", integration_type: "payment_network", vendor: "Stripe", status: "active", connection_method: "api", endpoint_url: "https://api.stripe.com/v1", sync_frequency: "realtime", records_synced: 1890 },
        { integration_name: "InstaMed", integration_type: "payment_network", vendor: "J.P. Morgan", status: "inactive", connection_method: "api", sync_frequency: "realtime", records_synced: 0 },
        { integration_name: "Quest Diagnostics", integration_type: "lab", vendor: "Quest", status: "active", connection_method: "hl7", sync_frequency: "hourly", records_synced: 6700 },
        { integration_name: "LabCorp", integration_type: "lab", vendor: "LabCorp", status: "inactive", connection_method: "fhir", sync_frequency: "hourly", records_synced: 0 },
      ];
      const { error } = await supabase.from("integration_configs").insert(configs);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration-configs"] });
      toast.success("Integration configurations loaded");
    },
  });
}

const typeIcons: Record<string, string> = {
  ehr: "🏥",
  clearinghouse: "🔄",
  payer_portal: "💳",
  payment_network: "💰",
  lab: "🔬",
};

const typeLabels: Record<string, string> = {
  ehr: "EHR System",
  clearinghouse: "Clearinghouse",
  payer_portal: "Payer Portal",
  payment_network: "Payment Network",
  lab: "Lab System",
};

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  inactive: "bg-muted text-muted-foreground border-border",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  pending: "bg-warning/15 text-warning border-warning/30",
};

const methodBadge: Record<string, string> = {
  fhir: "HL7 FHIR R4",
  hl7: "HL7 v2.x",
  edi: "EDI X12",
  api: "REST API",
  sftp: "SFTP",
};

export default function IntegrationHub() {
  const { data: integrations = [], isLoading } = useIntegrationConfigs();
  const seedIntegrations = useSeedIntegrations();

  const active = integrations.filter((i: any) => i.status === "active").length;
  const totalSynced = integrations.reduce((s: number, i: any) => s + (i.records_synced || 0), 0);
  const byType: Record<string, number> = {};
  integrations.forEach((i: any) => { byType[i.integration_type] = (byType[i.integration_type] || 0) + 1; });

  return (
    <div className="page-animate-in space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Integration Hub</h1>
          <p className="text-sm text-muted-foreground">EHR, clearinghouse, payer portal, and payment network integrations.</p>
        </div>
        {integrations.length === 0 && (
          <Button onClick={() => seedIntegrations.mutate()} disabled={seedIntegrations.isPending} className="gap-1">
            {seedIntegrations.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Load Integrations
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Integrations</p><p className="mt-1 text-2xl font-bold">{integrations.length}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-success">Active</p><p className="mt-1 text-2xl font-bold text-success">{active}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Records Synced</p><p className="mt-1 text-2xl font-bold">{totalSynced.toLocaleString()}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">EHR Systems</p><p className="mt-1 text-2xl font-bold">{byType.ehr || 0}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Clearinghouses</p><p className="mt-1 text-2xl font-bold">{byType.clearinghouse || 0}</p></CardContent></Card>
      </div>

      {/* Supported Standards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { std: "HL7 FHIR R4", desc: "Clinical data exchange" },
          { std: "EDI X12 837", desc: "Claim submission" },
          { std: "EDI X12 835", desc: "Payment/ERA" },
          { std: "EDI X12 276/277", desc: "Status inquiry" },
          { std: "HL7 v2.x ADT", desc: "Patient registration" },
        ].map(s => (
          <Card key={s.std} className="border-border/60"><CardContent className="p-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success shrink-0" />
            <div><p className="text-xs font-semibold">{s.std}</p><p className="text-[10px] text-muted-foreground">{s.desc}</p></div>
          </CardContent></Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : integrations.length === 0 ? (
        <Card className="border-border/60"><CardContent className="p-8 text-center">
          <Network className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No integrations configured</p>
          <p className="text-xs text-muted-foreground">Click "Load Integrations" to configure EHR and clearinghouse connections.</p>
        </CardContent></Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead className="w-10" />
              <TableHead>Integration</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Sync</TableHead>
              <TableHead>Records</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {integrations.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="text-center">{typeIcons[i.integration_type] || "🔌"}</TableCell>
                  <TableCell className="font-medium text-sm">{i.integration_name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{typeLabels[i.integration_type] || i.integration_type}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{i.vendor || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] font-mono">{methodBadge[i.connection_method] || i.connection_method}</Badge></TableCell>
                  <TableCell className="text-xs capitalize">{i.sync_frequency}</TableCell>
                  <TableCell className="text-sm font-medium">{(i.records_synced || 0).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px] border", statusColors[i.status])}>{i.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
