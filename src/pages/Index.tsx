import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/components/claims/KpiCards";
import { ClaimsPipeline } from "@/components/claims/ClaimsPipeline";
import { FileText, ArrowRight, Activity, Clock, AlertTriangle } from "lucide-react";
import { mockClaims, formatCurrency, formatClaimStatus, getClaimStatusColor } from "@/data/mock-claims";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const Index = () => {
  const recentClaims = mockClaims.slice(0, 5);
  const deniedCount = mockClaims.filter((c) => c.claim_status === "denied").length;
  const appealedCount = mockClaims.filter((c) => c.claim_status === "appealed").length;
  const highAR = mockClaims.filter((c) => c.days_in_ar > 30).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">RCM360 — Revenue Cycle Management Platform</p>
        </div>
        <Link to="/claims">
          <Button size="sm">
            <FileText className="mr-1 h-4 w-4" /> View All Claims
          </Button>
        </Link>
      </div>

      <KpiCards />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pipeline */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-primary" /> Claims Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ClaimsPipeline />
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-warning" /> Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/5 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{deniedCount} Denied Claims</p>
                <p className="text-xs text-muted-foreground">Require review or appeal</p>
              </div>
              <Badge variant="outline" className="border-destructive/30 text-destructive">{deniedCount}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border border-warning/20 bg-warning/5 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{highAR} Claims &gt;30 Days A/R</p>
                <p className="text-xs text-muted-foreground">Aging receivables need follow-up</p>
              </div>
              <Badge variant="outline" className="border-warning/30 text-warning">{highAR}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{appealedCount} Active Appeals</p>
                <p className="text-xs text-muted-foreground">Pending payer response</p>
              </div>
              <Badge variant="outline">{appealedCount}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recent */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-info" /> Recent Claims
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentClaims.map((claim) => (
              <Link
                to="/claims"
                key={claim.claim_id}
                className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{claim.patient_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{claim.claim_number}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{formatCurrency(claim.total_charge_amount)}</span>
                  <Badge variant="outline" className={cn("text-[10px] border", getClaimStatusColor(claim.claim_status))}>
                    {formatClaimStatus(claim.claim_status)}
                  </Badge>
                </div>
              </Link>
            ))}
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
