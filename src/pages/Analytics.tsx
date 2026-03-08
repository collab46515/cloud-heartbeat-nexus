import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClaimStats } from "@/hooks/useClaims";
import { useDenialStats } from "@/hooks/useDenials";
import { formatCurrency } from "@/data/mock-claims";
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Activity, Target, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { cn } from "@/lib/utils";

const COLORS = ["hsl(215,80%,42%)", "hsl(152,60%,40%)", "hsl(38,92%,50%)", "hsl(0,72%,51%)", "hsl(280,60%,50%)", "hsl(199,89%,48%)"];

export default function Analytics() {
  const { data: claimStats, isLoading: loadingClaims } = useClaimStats();
  const { data: denialStats, isLoading: loadingDenials } = useDenialStats();

  if (loadingClaims || loadingDenials) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusData = claimStats?.statusCounts
    ? Object.entries(claimStats.statusCounts).map(([status, count]) => ({
        name: status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        value: count,
      }))
    : [];

  const denialCatData = denialStats?.byCat
    ? Object.entries(denialStats.byCat).map(([cat, count]) => ({
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        value: count,
      }))
    : [];

  const groupCodeData = denialStats?.byGroup
    ? Object.entries(denialStats.byGroup).map(([group, amount]) => ({
        name: group === "CO" ? "Contractual (CO)" : group === "PR" ? "Patient Resp (PR)" : group === "OA" ? "Other Adj (OA)" : group,
        amount,
      }))
    : [];

  // Simulated benchmark data
  const benchmarkData = [
    { metric: "Clean Claim Rate", yours: Number(claimStats?.cleanRate || 0), benchmark: 95, unit: "%" },
    { metric: "Days in A/R", yours: Number(claimStats?.avgDaysAR || 0), benchmark: 35, unit: " days", lowerBetter: true },
    { metric: "Collection Rate", yours: Number(claimStats?.collectionRate || 0), benchmark: 96, unit: "%" },
    { metric: "Denial Rate", yours: Number(claimStats?.denialRate || 0), benchmark: 5, unit: "%", lowerBetter: true },
  ];

  return (
    <div className="page-animate-in space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Revenue Intelligence</h1>
        <p className="text-sm text-muted-foreground">Analytics, benchmarking, and predictive insights for your revenue cycle.</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1"><Activity className="h-3 w-3" /> Overview</TabsTrigger>
          <TabsTrigger value="denials" className="gap-1"><AlertTriangle className="h-3 w-3" /> Denial Analytics</TabsTrigger>
          <TabsTrigger value="benchmark" className="gap-1"><Target className="h-3 w-3" /> Benchmarking</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Claims</p>
                <p className="mt-1 text-3xl font-bold">{claimStats?.total ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending Amount</p>
                <p className="mt-1 text-3xl font-bold text-warning">{formatCurrency(claimStats?.pendingAmount ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Days A/R</p>
                <p className="mt-1 text-3xl font-bold">{claimStats?.avgDaysAR ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Collection Rate</p>
                <p className="mt-1 text-3xl font-bold text-success">{claimStats?.collectionRate ?? 0}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Claims by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Denial Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {denialCatData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={denialCatData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {denialCatData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No denial data yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="denials" className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs uppercase text-muted-foreground">Total Denials</p>
                <p className="mt-1 text-3xl font-bold text-destructive">{denialStats?.total ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs uppercase text-muted-foreground">Denied Amount</p>
                <p className="mt-1 text-3xl font-bold text-destructive">{formatCurrency(denialStats?.totalAmount ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs uppercase text-muted-foreground">Overturn Rate</p>
                <p className="mt-1 text-3xl font-bold text-success">
                  {denialStats && denialStats.total > 0 ? ((denialStats.overturned / denialStats.total) * 100).toFixed(0) : 0}%
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs uppercase text-muted-foreground">Open Denials</p>
                <p className="mt-1 text-3xl font-bold text-warning">{denialStats?.open ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          {groupCodeData.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Denial Amount by Group Code</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={groupCodeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="amount" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="benchmark" className="space-y-6 pt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Performance vs. Industry Benchmarks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {benchmarkData.map((b) => {
                  const isGood = b.lowerBetter ? b.yours <= b.benchmark : b.yours >= b.benchmark;
                  return (
                    <div key={b.metric} className="flex items-center gap-4">
                      <div className="w-40 text-sm font-medium text-foreground">{b.metric}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={cn("font-bold", isGood ? "text-success" : "text-destructive")}>
                            {b.yours}{b.unit}
                          </span>
                          <span className="text-muted-foreground">Benchmark: {b.benchmark}{b.unit}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className={cn("h-2 rounded-full transition-all", isGood ? "bg-success" : "bg-destructive")}
                            style={{ width: `${Math.min((b.lowerBetter ? b.benchmark / Math.max(b.yours, 1) : b.yours / Math.max(b.benchmark, 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      {isGood ? (
                        <TrendingUp className="h-4 w-4 text-success shrink-0" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* What-If Simulator */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-success" /> Revenue Impact Simulator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs font-medium text-foreground">If denial rate reduced by 5%</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Estimated annual revenue recovery: <span className="font-bold text-success">{formatCurrency((claimStats?.pendingAmount ?? 0) * 0.05)}</span>
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs font-medium text-foreground">If A/R days reduced to 30</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Estimated cash flow improvement: <span className="font-bold text-success">{formatCurrency((claimStats?.pendingAmount ?? 0) * 0.15)}</span>
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs font-medium text-foreground">If clean claim rate reaches 98%</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Estimated processing savings: <span className="font-bold text-success">{formatCurrency((claimStats?.total ?? 0) * 12)}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
