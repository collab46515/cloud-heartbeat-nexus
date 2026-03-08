import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign, Target, BarChart3, Calculator, Loader2, Brain } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { cn } from "@/lib/utils";

function useRevenueMetrics() {
  return useQuery({
    queryKey: ["revenue-metrics"],
    queryFn: async () => {
      const { data: claims } = await supabase.from("claims").select("claim_status, total_charge_amount, total_paid_amount, days_in_ar, payer_id, service_date").limit(500);
      const { data: payers } = await supabase.from("payers").select("id, name, denial_rate, avg_days_to_pay");
      const { data: denials } = await supabase.from("denial_workflows").select("denial_amount, denial_category, appeal_status");

      const totalCharges = (claims || []).reduce((s, c) => s + Number(c.total_charge_amount), 0);
      const totalPaid = (claims || []).reduce((s, c) => s + Number(c.total_paid_amount), 0);
      const avgDaysAR = claims?.length ? (claims.reduce((s, c) => s + c.days_in_ar, 0) / claims.length) : 0;
      const netCollectionRate = totalCharges > 0 ? (totalPaid / totalCharges) * 100 : 0;
      const deniedCount = (claims || []).filter(c => c.claim_status === "denied").length;
      const fprr = claims?.length ? ((claims.length - deniedCount) / claims.length) * 100 : 0;
      const totalDenialAmount = (denials || []).reduce((s, d) => s + Number(d.denial_amount), 0);

      // Payer performance
      const payerPerf = (payers || []).map(p => {
        const payerClaims = (claims || []).filter(c => c.payer_id === p.id);
        const payerPaid = payerClaims.reduce((s, c) => s + Number(c.total_paid_amount), 0);
        const payerCharged = payerClaims.reduce((s, c) => s + Number(c.total_charge_amount), 0);
        return { name: p.name.substring(0, 15), claims: payerClaims.length, paid: payerPaid, charged: payerCharged, yield: payerCharged > 0 ? ((payerPaid / payerCharged) * 100).toFixed(1) : "0" };
      }).filter(p => p.claims > 0);

      // Denial by category
      const denialByCat: Record<string, number> = {};
      (denials || []).forEach(d => { denialByCat[d.denial_category] = (denialByCat[d.denial_category] || 0) + Number(d.denial_amount); });
      const denialCategories = Object.entries(denialByCat).map(([name, value]) => ({ name, value }));

      // Monthly trend (mock based on service dates)
      const monthlyMap: Record<string, { charges: number; paid: number }> = {};
      (claims || []).forEach(c => {
        const m = c.service_date?.substring(0, 7) || "Unknown";
        if (!monthlyMap[m]) monthlyMap[m] = { charges: 0, paid: 0 };
        monthlyMap[m].charges += Number(c.total_charge_amount);
        monthlyMap[m].paid += Number(c.total_paid_amount);
      });
      const monthlyTrend = Object.entries(monthlyMap).sort().slice(-6).map(([month, d]) => ({ month: month.substring(5), ...d }));

      return { totalCharges, totalPaid, avgDaysAR, netCollectionRate, fprr, totalDenialAmount, payerPerf, denialCategories, monthlyTrend, claimCount: claims?.length || 0 };
    },
  });
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--success))", "hsl(var(--info))", "hsl(var(--warning))"];

const benchmarks = [
  { metric: "Net Collection Rate", target: "≥98%", industry: "95.2%", topPerformer: "99.1%" },
  { metric: "First Pass Resolution", target: "≥90%", industry: "82.5%", topPerformer: "95.8%" },
  { metric: "Days in A/R", target: "<40", industry: "48.3", topPerformer: "32.1" },
  { metric: "Denial Rate", target: "<5%", industry: "8.6%", topPerformer: "3.2%" },
  { metric: "Clean Claim Rate", target: "≥95%", industry: "88.4%", topPerformer: "97.6%" },
];

export default function RevenueIntelligence() {
  const { data, isLoading } = useRevenueMetrics();
  const [simCharges, setSimCharges] = useState("100000");
  const [simDenialRate, setSimDenialRate] = useState("8");
  const [simCollectionRate, setSimCollectionRate] = useState("95");

  const simRevenue = Number(simCharges) * (1 - Number(simDenialRate) / 100) * (Number(simCollectionRate) / 100);
  const simLost = Number(simCharges) - simRevenue;

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="page-animate-in space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Revenue Intelligence & Benchmarking</h1>
        <p className="text-sm text-muted-foreground">AI-powered revenue analytics, what-if simulation, and industry benchmarking.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Charges</p><p className="mt-1 text-xl font-bold">${(data?.totalCharges || 0).toLocaleString("en", { maximumFractionDigits: 0 })}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Collected</p><p className="mt-1 text-xl font-bold text-success">${(data?.totalPaid || 0).toLocaleString("en", { maximumFractionDigits: 0 })}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Net Collection</p><p className="mt-1 text-xl font-bold">{(data?.netCollectionRate || 0).toFixed(1)}%</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">FPRR</p><p className="mt-1 text-xl font-bold">{(data?.fprr || 0).toFixed(1)}%</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avg Days A/R</p><p className="mt-1 text-xl font-bold">{(data?.avgDaysAR || 0).toFixed(0)}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Denial Losses</p><p className="mt-1 text-xl font-bold text-destructive">${(data?.totalDenialAmount || 0).toLocaleString("en", { maximumFractionDigits: 0 })}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card className="border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data?.monthlyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Line type="monotone" dataKey="charges" stroke="hsl(var(--muted-foreground))" strokeWidth={2} name="Charges" dot={false} />
                <Line type="monotone" dataKey="paid" stroke="hsl(var(--primary))" strokeWidth={2} name="Collected" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Denial by Category */}
        <Card className="border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Denial Revenue Impact</CardTitle></CardHeader>
          <CardContent>
            {(data?.denialCategories?.length || 0) > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data?.denialCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                    {data?.denialCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="py-12 text-center text-sm text-muted-foreground">No denial data available</p>}
          </CardContent>
        </Card>

        {/* Payer Performance */}
        <Card className="border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" /> Payer Yield Comparison</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.payerPerf || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-[10px] fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Bar dataKey="charged" fill="hsl(var(--muted-foreground))" name="Charged" radius={[2, 2, 0, 0]} />
                <Bar dataKey="paid" fill="hsl(var(--primary))" name="Collected" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* What-If Simulator */}
        <Card className="border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Calculator className="h-4 w-4" /> What-If Revenue Simulator</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Monthly Charges</Label><Input type="number" value={simCharges} onChange={e => setSimCharges(e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Denial Rate %</Label><Input type="number" value={simDenialRate} onChange={e => setSimDenialRate(e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Collection Rate %</Label><Input type="number" value={simCollectionRate} onChange={e => setSimCollectionRate(e.target.value)} className="h-8 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                <p className="text-[10px] font-medium uppercase text-success">Projected Revenue</p>
                <p className="text-xl font-bold text-success">${simRevenue.toLocaleString("en", { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-[10px] font-medium uppercase text-destructive">Revenue Leakage</p>
                <p className="text-xl font-bold text-destructive">${simLost.toLocaleString("en", { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Adjust parameters to model different scenarios. Reducing denial rate by 1% could recover ~${(Number(simCharges) * 0.01 * Number(simCollectionRate) / 100).toLocaleString("en", { maximumFractionDigits: 0 })}/mo.</p>
          </CardContent>
        </Card>
      </div>

      {/* Industry Benchmarking */}
      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4" /> Industry Benchmarking</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2 pr-4">Metric</th><th className="pb-2 pr-4">Your Target</th><th className="pb-2 pr-4">Industry Avg</th><th className="pb-2 pr-4">Top Performer</th><th className="pb-2">Your Performance</th></tr></thead>
              <tbody>
                {benchmarks.map((b, i) => {
                  const yours = i === 0 ? `${(data?.netCollectionRate || 0).toFixed(1)}%` : i === 1 ? `${(data?.fprr || 0).toFixed(1)}%` : i === 2 ? `${(data?.avgDaysAR || 0).toFixed(0)}` : i === 3 ? `${data?.claimCount ? ((data.claimCount - (data?.fprr || 0) * data.claimCount / 100) / data.claimCount * 100).toFixed(1) : "0"}%` : "—";
                  return (
                    <tr key={b.metric} className="border-b border-border/40">
                      <td className="py-2 pr-4 font-medium">{b.metric}</td>
                      <td className="py-2 pr-4">{b.target}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{b.industry}</td>
                      <td className="py-2 pr-4 text-success">{b.topPerformer}</td>
                      <td className="py-2 font-semibold">{yours}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
