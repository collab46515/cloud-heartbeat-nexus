import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, MapPin, Shield, Database, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function useDataResidencyConfigs() {
  return useQuery({
    queryKey: ["data-residency"],
    queryFn: async () => {
      const { data, error } = await supabase.from("data_residency_configs").select("*").order("is_primary", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useSeedRegions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const regions = [
        { region_name: "US East (Virginia)", region_code: "us-east-1", country_code: "US", regulation: "HIPAA", data_types: ["phi", "pii", "financial", "audit"], encryption_standard: "AES-256", is_primary: true, status: "active" },
        { region_name: "US West (Oregon)", region_code: "us-west-2", country_code: "US", regulation: "HIPAA", data_types: ["phi", "pii", "financial"], encryption_standard: "AES-256", is_primary: false, status: "active" },
        { region_name: "EU West (Ireland)", region_code: "eu-west-1", country_code: "IE", regulation: "GDPR", data_types: ["pii", "financial"], encryption_standard: "AES-256-GCM", is_primary: false, status: "active" },
        { region_name: "EU Central (Frankfurt)", region_code: "eu-central-1", country_code: "DE", regulation: "GDPR", data_types: ["pii", "financial", "audit"], encryption_standard: "AES-256-GCM", is_primary: false, status: "standby" },
        { region_name: "Asia Pacific (Singapore)", region_code: "ap-southeast-1", country_code: "SG", regulation: "PDPA", data_types: ["pii", "financial"], encryption_standard: "AES-256", is_primary: false, status: "standby" },
        { region_name: "Middle East (Bahrain)", region_code: "me-south-1", country_code: "BH", regulation: "PDPL", data_types: ["pii", "financial"], encryption_standard: "AES-256", is_primary: false, status: "planned" },
        { region_name: "UK (London)", region_code: "eu-west-2", country_code: "GB", regulation: "UK-GDPR", data_types: ["pii", "financial"], encryption_standard: "AES-256-GCM", is_primary: false, status: "planned" },
        { region_name: "Australia (Sydney)", region_code: "ap-southeast-2", country_code: "AU", regulation: "Privacy Act", data_types: ["pii"], encryption_standard: "AES-256", is_primary: false, status: "planned" },
      ];
      const { error } = await supabase.from("data_residency_configs").insert(regions);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["data-residency"] });
      toast.success("Data residency regions configured");
    },
  });
}

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  standby: "bg-info/15 text-info border-info/30",
  planned: "bg-muted text-muted-foreground border-border",
};

const regulationColors: Record<string, string> = {
  HIPAA: "bg-primary/15 text-primary border-primary/30",
  GDPR: "bg-info/15 text-info border-info/30",
  "UK-GDPR": "bg-info/15 text-info border-info/30",
  PDPA: "bg-warning/15 text-warning border-warning/30",
  PDPL: "bg-warning/15 text-warning border-warning/30",
  "Privacy Act": "bg-muted text-muted-foreground border-border",
};

export default function DataResidency() {
  const { data: regions = [], isLoading } = useDataResidencyConfigs();
  const seedRegions = useSeedRegions();

  const active = regions.filter((r: any) => r.status === "active").length;
  const standby = regions.filter((r: any) => r.status === "standby").length;
  const primary = regions.find((r: any) => r.is_primary);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Global Data Residency</h1>
          <p className="text-sm text-muted-foreground">Multi-region data storage, regulatory compliance mapping, and encryption standards.</p>
        </div>
        {regions.length === 0 && (
          <Button onClick={() => seedRegions.mutate()} disabled={seedRegions.isPending} className="gap-1">
            {seedRegions.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Configure Regions
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Regions</p><p className="mt-1 text-2xl font-bold">{regions.length}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-success">Active</p><p className="mt-1 text-2xl font-bold text-success">{active}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-info">Standby</p><p className="mt-1 text-2xl font-bold text-info">{standby}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Primary</p><p className="mt-1 text-lg font-bold">{primary?.region_code || "—"}</p></CardContent></Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : regions.length === 0 ? (
        <Card className="border-border/60"><CardContent className="p-8 text-center">
          <Globe className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No regions configured</p>
          <p className="text-xs text-muted-foreground">Click "Configure Regions" to set up global data residency.</p>
        </CardContent></Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead className="w-10" />
              <TableHead>Region</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Regulation</TableHead>
              <TableHead>Data Types</TableHead>
              <TableHead>Encryption</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {regions.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.is_primary ? <CheckCircle className="h-4 w-4 text-primary" /> : <MapPin className="h-4 w-4 text-muted-foreground" />}</TableCell>
                  <TableCell className="font-medium text-sm">{r.region_name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.region_code}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.country_code}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px] border", regulationColors[r.regulation] || "")}>{r.regulation}</Badge></TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">{(r.data_types || []).join(", ")}</TableCell>
                  <TableCell className="text-xs font-mono">{r.encryption_standard}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px] border", statusColors[r.status])}>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Data Flow Rules */}
      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Cross-Border Data Flow Rules</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { rule: "PHI data must remain in HIPAA-compliant regions (US)", status: "enforced" },
              { rule: "EU patient PII stored only in GDPR-compliant regions", status: "enforced" },
              { rule: "Audit logs replicated to primary + 1 backup region", status: "enforced" },
              { rule: "Cross-region transfers require encryption in transit (TLS 1.3)", status: "enforced" },
              { rule: "Data deletion requests propagated to all regions within 72h", status: "configured" },
              { rule: "Backup retention: 30 days active, 90 days archive", status: "configured" },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded border border-border/40 px-3 py-2">
                <span className="text-sm">{r.rule}</span>
                <Badge variant="outline" className={cn("text-[10px]", r.status === "enforced" ? "text-success border-success/30" : "text-info border-info/30")}>{r.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
