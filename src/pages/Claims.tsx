import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCards } from "@/components/claims/KpiCards";
import { ClaimsPipeline } from "@/components/claims/ClaimsPipeline";
import { ClaimsTable } from "@/components/claims/ClaimsTable";

const Claims = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Claims Management</h1>
        <p className="text-sm text-muted-foreground">
          Track, scrub, and manage claims across the full lifecycle — from charge capture to payment posting.
        </p>
      </div>

      {/* KPIs */}
      <KpiCards />

      {/* Pipeline + Table */}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Claims Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ClaimsPipeline />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <ClaimsTable />
        </div>
      </div>
    </div>
  );
};

export default Claims;
