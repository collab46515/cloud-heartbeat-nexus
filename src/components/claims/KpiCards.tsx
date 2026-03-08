import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClaimStats } from "@/hooks/useClaims";
import { formatCurrency } from "@/data/mock-claims";

interface KpiCardProps {
  label: string;
  value: string;
  change?: number;
  trend?: "up" | "down" | "flat";
  subtitle?: string;
}

function KpiCard({ label, value, change, trend, subtitle }: KpiCardProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
          {change !== undefined && (
            <span className={cn("mb-0.5 flex items-center gap-0.5 text-xs font-semibold",
              trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
            )}>
              {trend === "up" ? <TrendingUp className="h-3 w-3" /> : trend === "down" ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {Math.abs(change)}%
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export function KpiCards() {
  const { data: stats, isLoading } = useClaimStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpis: KpiCardProps[] = [
    { label: "Total Claims", value: String(stats?.total ?? 0), subtitle: "All time" },
    { label: "Clean Claim Rate", value: `${stats?.cleanRate ?? 0}%`, subtitle: "Target: 95%" },
    { label: "Avg Days in A/R", value: String(stats?.avgDaysAR ?? 0), subtitle: "Target: <40 days" },
    { label: "Net Collection Rate", value: `${stats?.collectionRate ?? 0}%`, subtitle: "Target: 98%" },
    { label: "Denial Rate", value: `${stats?.denialRate ?? 0}%`, subtitle: "Target: <5%" },
    { label: "Pending Amount", value: formatCurrency(stats?.pendingAmount ?? 0), subtitle: `${stats?.pendingCount ?? 0} claims` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}
