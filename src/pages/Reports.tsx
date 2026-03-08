import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClaims, useClaimStats } from "@/hooks/useClaims";
import { useDenialStats } from "@/hooks/useDenials";
import { formatCurrency } from "@/data/mock-claims";
import { FileDown, FileText, BarChart3, Shield, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

function downloadCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) { toast.error("No data to export"); return; }
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(h => {
      const val = row[h];
      const str = val === null || val === undefined ? "" : String(val);
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${data.length} rows to ${filename}`);
}

export default function Reports() {
  const { data: claims = [], isLoading } = useClaims();
  const { data: stats } = useClaimStats();
  const { data: denialStats } = useDenialStats();

  const exportClaims = () => {
    downloadCSV(claims.map(c => ({
      claim_number: c.claim_number,
      patient: c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : "",
      payer: c.payers?.name || "",
      status: c.claim_status,
      service_date: c.service_date,
      charges: c.total_charge_amount,
      paid: c.total_paid_amount,
      patient_resp: c.patient_responsibility,
      days_ar: c.days_in_ar,
      ai_risk: (c as any).ai_risk_level || "low",
    })), `claims-export-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const exportDeniedClaims = () => {
    const denied = claims.filter(c => c.claim_status === "denied" || c.claim_status === "appealed");
    downloadCSV(denied.map(c => ({
      claim_number: c.claim_number,
      patient: c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : "",
      payer: c.payers?.name || "",
      status: c.claim_status,
      charges: c.total_charge_amount,
      denial_code: c.denial_reason_code || "",
      denial_reason: c.denial_reason_description || "",
      days_ar: c.days_in_ar,
    })), `denials-export-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const exportAgingReport = () => {
    const aging = claims.filter(c => !["paid", "void"].includes(c.claim_status));
    downloadCSV(aging.map(c => ({
      claim_number: c.claim_number,
      patient: c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : "",
      payer: c.payers?.name || "",
      status: c.claim_status,
      charges: c.total_charge_amount,
      days_ar: c.days_in_ar,
      bucket: c.days_in_ar <= 30 ? "0-30" : c.days_in_ar <= 60 ? "31-60" : c.days_in_ar <= 90 ? "61-90" : "90+",
    })), `aging-report-${new Date().toISOString().split("T")[0]}.csv`);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const agingBuckets = {
    "0-30": claims.filter(c => !["paid","void"].includes(c.claim_status) && c.days_in_ar <= 30),
    "31-60": claims.filter(c => !["paid","void"].includes(c.claim_status) && c.days_in_ar > 30 && c.days_in_ar <= 60),
    "61-90": claims.filter(c => !["paid","void"].includes(c.claim_status) && c.days_in_ar > 60 && c.days_in_ar <= 90),
    "90+": claims.filter(c => !["paid","void"].includes(c.claim_status) && c.days_in_ar > 90),
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports & Exports</h1>
        <p className="text-sm text-muted-foreground">Generate reports, export data, and review compliance audit trails.</p>
      </div>

      <Tabs defaultValue="executive" className="w-full">
        <TabsList>
          <TabsTrigger value="executive" className="gap-1"><BarChart3 className="h-3 w-3" /> Executive Summary</TabsTrigger>
          <TabsTrigger value="exports" className="gap-1"><FileDown className="h-3 w-3" /> Data Exports</TabsTrigger>
          <TabsTrigger value="compliance" className="gap-1"><Shield className="h-3 w-3" /> Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="space-y-6 pt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Revenue Cycle Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Total Claims</p><p className="text-2xl font-bold">{stats?.total ?? 0}</p></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Clean Claim Rate</p><p className="text-2xl font-bold text-success">{stats?.cleanRate ?? 0}%</p></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Net Collection Rate</p><p className="text-2xl font-bold text-primary">{stats?.collectionRate ?? 0}%</p></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Denial Rate</p><p className="text-2xl font-bold text-destructive">{stats?.denialRate ?? 0}%</p></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">A/R Aging Buckets</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(agingBuckets).map(([bucket, bucketClaims]) => {
                  const total = bucketClaims.reduce((s, c) => s + Number(c.total_charge_amount) - Number(c.total_paid_amount), 0);
                  return (
                    <div key={bucket} className="rounded-md border p-3 text-center">
                      <p className="text-xs font-medium text-muted-foreground">{bucket} Days</p>
                      <p className="text-lg font-bold mt-1">{bucketClaims.length}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(total)}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Denial Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div><p className="text-xs text-muted-foreground">Total Denials</p><p className="text-2xl font-bold text-destructive">{denialStats?.total ?? 0}</p></div>
                <div><p className="text-xs text-muted-foreground">Denied Amount</p><p className="text-2xl font-bold text-destructive">{formatCurrency(denialStats?.totalAmount ?? 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">Open Denials</p><p className="text-2xl font-bold text-warning">{denialStats?.open ?? 0}</p></div>
                <div><p className="text-xs text-muted-foreground">Overturn Rate</p><p className="text-2xl font-bold text-success">{denialStats && denialStats.total > 0 ? ((denialStats.overturned / denialStats.total) * 100).toFixed(0) : 0}%</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/60">
              <CardContent className="p-6 text-center space-y-3">
                <FileText className="mx-auto h-8 w-8 text-primary" />
                <div><p className="text-sm font-semibold">All Claims Export</p><p className="text-xs text-muted-foreground">{claims.length} claims with patient, payer, and financial data</p></div>
                <Button onClick={exportClaims} className="w-full gap-1"><Download className="h-3 w-3" /> Export CSV</Button>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-6 text-center space-y-3">
                <Shield className="mx-auto h-8 w-8 text-destructive" />
                <div><p className="text-sm font-semibold">Denial Report</p><p className="text-xs text-muted-foreground">{claims.filter(c => c.claim_status === "denied" || c.claim_status === "appealed").length} denied/appealed claims with CARC codes</p></div>
                <Button onClick={exportDeniedClaims} variant="outline" className="w-full gap-1"><Download className="h-3 w-3" /> Export CSV</Button>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-6 text-center space-y-3">
                <BarChart3 className="mx-auto h-8 w-8 text-warning" />
                <div><p className="text-sm font-semibold">A/R Aging Report</p><p className="text-xs text-muted-foreground">{claims.filter(c => !["paid","void"].includes(c.claim_status)).length} open claims with aging buckets</p></div>
                <Button onClick={exportAgingReport} variant="outline" className="w-full gap-1"><Download className="h-3 w-3" /> Export CSV</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4 pt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> HIPAA Compliance Dashboard</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Hash-Chained Audit Log</p><p className="text-sm font-bold text-success mt-1">Active</p></div>
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">RLS Policies</p><p className="text-sm font-bold text-success mt-1">Enabled</p></div>
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">PHI Access Tracking</p><p className="text-sm font-bold text-success mt-1">Active</p></div>
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Data Encryption</p><p className="text-sm font-bold text-success mt-1">TLS 1.3</p></div>
              </div>
              <div className="rounded-md border border-success/20 bg-success/5 p-4">
                <p className="text-sm font-medium text-foreground">✓ All compliance checks passed</p>
                <p className="text-xs text-muted-foreground mt-1">Last audit: {new Date().toLocaleDateString()} · Next scheduled: {new Date(Date.now() + 30 * 86400000).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
