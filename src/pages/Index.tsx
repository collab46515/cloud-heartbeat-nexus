import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/components/claims/KpiCards";
import { ClaimsPipeline } from "@/components/claims/ClaimsPipeline";
import { FileText, ArrowRight, Activity, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { formatCurrency, formatClaimStatus, getClaimStatusColor } from "@/data/mock-claims";
import { useClaims, useClaimStats } from "@/hooks/useClaims";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const Index = () => {
  const { data: claims = [], isLoading } = useClaims();
  const { data: stats } = useClaimStats();

  const recentClaims = claims.slice(0, 5);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">RCM360 — Revenue Cycle Management Platform</p>
        </div>
        <Link to="/claims">
          <Button size="sm"><FileText className="mr-1 h-4 w-4" /> View All Claims</Button>
        </Link>
      </div>

      <KpiCards />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-primary" /> Claims Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent><ClaimsPipeline /></CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-warning" /> Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/5 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{stats?.denied ?? 0} Denied Claims</p>
                <p className="text-xs text-muted-foreground">Require review or appeal</p>
              </div>
              <Badge variant="outline" className="border-destructive/30 text-destructive">{stats?.denied ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border border-warning/20 bg-warning/5 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{stats?.highAR ?? 0} Claims &gt;30 Days A/R</p>
                <p className="text-xs text-muted-foreground">Aging receivables</p>
              </div>
              <Badge variant="outline" className="border-warning/30 text-warning">{stats?.highAR ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{stats?.appealed ?? 0} Active Appeals</p>
                <p className="text-xs text-muted-foreground">Pending payer response</p>
              </div>
              <Badge variant="outline">{stats?.appealed ?? 0}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-info" /> Recent Claims
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : recentClaims.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No claims yet</p>
            ) : (
              recentClaims.map((claim) => (
                <Link to="/claims" key={claim.id} className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-muted/50 transition-colors">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {claim.patients ? `${claim.patients.first_name} ${claim.patients.last_name}` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{claim.claim_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{formatCurrency(Number(claim.total_charge_amount))}</span>
                    <Badge variant="outline" className={cn("text-[10px] border", getClaimStatusColor(claim.claim_status))}>
                      {formatClaimStatus(claim.claim_status)}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
            <Link to="/claims" className="flex items-center gap-1 pt-2 text-xs font-medium text-primary hover:underline">
              View all claims <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
