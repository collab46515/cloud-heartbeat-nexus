import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/components/claims/KpiCards";
import { ClaimsPipeline } from "@/components/claims/ClaimsPipeline";
import { ClaimsTable } from "@/components/claims/ClaimsTable";
import { ClaimWizard } from "@/components/claims/ClaimWizard";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Plus } from "lucide-react";

const Claims = () => {
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <PageWrapper
      title="Claims Management"
      description="Track, scrub, and manage claims across the full lifecycle — from charge capture to payment posting."
      actions={
        <Button size="sm" onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Claim
        </Button>
      }
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
