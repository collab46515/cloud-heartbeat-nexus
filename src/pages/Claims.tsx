import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCards } from "@/components/claims/KpiCards";
import { ClaimsPipeline } from "@/components/claims/ClaimsPipeline";
import { ClaimsTable } from "@/components/claims/ClaimsTable";
import { PageWrapper } from "@/components/layout/PageWrapper";

const Claims = () => {
  return (
    <PageWrapper
      title="Claims Management"
      description="Track, scrub, and manage claims across the full lifecycle — from charge capture to payment posting."
    >
      <KpiCards />

      <Card className="kpi-card">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold">Claims Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <ClaimsPipeline />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <ClaimsTable />
      </div>
    </PageWrapper>
  );
};

export default Claims;
