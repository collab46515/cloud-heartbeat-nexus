import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Fingerprint, AlertTriangle, Shield, Eye, Loader2, Activity, Users } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

function useSessionEvents() {
  return useQuery({
    queryKey: ["session-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("session_events").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
}

function useUBAMetrics() {
  return useQuery({
    queryKey: ["uba-metrics"],
    queryFn: async () => {
      const { data: events } = await supabase.from("session_events").select("*").limit(500);
      const { data: auditLog } = await supabase.from("claim_audit_log").select("user_id, action, phi_accessed, created_at, ip_address").order("created_at", { ascending: false }).limit(200);

      const totalSessions = (events || []).length;
      const anomalies = (events || []).filter(e => e.is_anomalous).length;
      const uniqueUsers = new Set((events || []).map(e => e.user_id).filter(Boolean)).size;
      const phiAccesses = (auditLog || []).filter(a => a.phi_accessed).length;
      const avgRiskScore = totalSessions > 0 ? (events || []).reduce((s, e) => s + Number(e.risk_score || 0), 0) / totalSessions : 0;

      // Risk trend (hourly buckets from audit log)
      const hourMap: Record<string, { total: number; risky: number }> = {};
      (auditLog || []).forEach(a => {
        const h = new Date(a.created_at).toISOString().substring(0, 13);
        if (!hourMap[h]) hourMap[h] = { total: 0, risky: 0 };
        hourMap[h].total++;
        if (a.phi_accessed) hourMap[h].risky++;
      });
      const riskTrend = Object.entries(hourMap).sort().slice(-12).map(([hour, d]) => ({
        hour: hour.substring(11) + ":00",
        total: d.total,
        risky: d.risky,
      }));

      // Top users by PHI access
      const userPhiMap: Record<string, number> = {};
      (auditLog || []).filter(a => a.phi_accessed).forEach(a => {
        if (a.user_id) userPhiMap[a.user_id] = (userPhiMap[a.user_id] || 0) + 1;
      });
      const topUsers = Object.entries(userPhiMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({ userId: id.substring(0, 8), count }));

      // IP analysis
      const ipMap: Record<string, number> = {};
      (auditLog || []).forEach(a => {
        if (a.ip_address) ipMap[a.ip_address] = (ipMap[a.ip_address] || 0) + 1;
      });
      const ipAnalysis = Object.entries(ipMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([ip, count]) => ({ ip, count }));

      return { totalSessions, anomalies, uniqueUsers, phiAccesses, avgRiskScore, riskTrend, topUsers, ipAnalysis, auditLog: auditLog || [] };
    },
  });
}

export default function BehavioralBiometrics() {
  const { data: events = [], isLoading: eventsLoading } = useSessionEvents();
  const { data: metrics, isLoading: metricsLoading } = useUBAMetrics();

  const isLoading = eventsLoading || metricsLoading;

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="page-animate-in space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Behavioral Biometrics & UBA</h1>
        <p className="text-sm text-muted-foreground">User behavior analytics, session monitoring, anomaly detection, and PHI access tracking.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Sessions</p><p className="mt-1 text-2xl font-bold">{metrics?.totalSessions || 0}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Unique Users</p><p className="mt-1 text-2xl font-bold">{metrics?.uniqueUsers || 0}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-destructive">Anomalies</p><p className="mt-1 text-2xl font-bold text-destructive">{metrics?.anomalies || 0}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-warning">PHI Accesses</p><p className="mt-1 text-2xl font-bold text-warning">{metrics?.phiAccesses || 0}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avg Risk Score</p><p className={cn("mt-1 text-2xl font-bold", (metrics?.avgRiskScore || 0) > 50 ? "text-destructive" : "text-success")}>{(metrics?.avgRiskScore || 0).toFixed(0)}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Trend */}
        <Card className="border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4" /> Activity & Risk Trend</CardTitle></CardHeader>
          <CardContent>
            {(metrics?.riskTrend?.length || 0) > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={metrics?.riskTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="hour" className="text-[10px] fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} name="Total Actions" dot={false} />
                  <Line type="monotone" dataKey="risky" stroke="hsl(var(--destructive))" strokeWidth={2} name="PHI Access" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="py-12 text-center text-sm text-muted-foreground">No activity data available yet</p>}
          </CardContent>
        </Card>

        {/* IP Analysis */}
        <Card className="border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> IP Address Analysis</CardTitle></CardHeader>
          <CardContent>
            {(metrics?.ipAnalysis?.length || 0) > 0 ? (
              <div className="space-y-2">
                {metrics?.ipAnalysis.map((ip, i) => (
                  <div key={ip.ip} className="flex items-center justify-between rounded border border-border/40 px-3 py-2">
                    <span className="font-mono text-xs">{ip.ip}</span>
                    <Badge variant="outline" className="text-[10px]">{ip.count} actions</Badge>
                  </div>
                ))}
              </div>
            ) : <p className="py-12 text-center text-sm text-muted-foreground">No IP data available</p>}
          </CardContent>
        </Card>
      </div>

      {/* Recent Audit Activity */}
      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Eye className="h-4 w-4" /> Recent Audit Activity</CardTitle></CardHeader>
        <CardContent className="p-0">
          {(metrics?.auditLog?.length || 0) > 0 ? (
            <Table>
              <TableHeader><TableRow className="bg-muted/40">
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>PHI</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Time</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {metrics?.auditLog.slice(0, 20).map((a: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{a.user_id?.substring(0, 8) || "system"}</TableCell>
                    <TableCell className="text-sm">{a.action}</TableCell>
                    <TableCell>{a.phi_accessed ? <AlertTriangle className="h-4 w-4 text-warning" /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="font-mono text-xs">{a.ip_address || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="p-8 text-center text-sm text-muted-foreground">No audit activity recorded yet</p>}
        </CardContent>
      </Card>
    </div>
  );
}
