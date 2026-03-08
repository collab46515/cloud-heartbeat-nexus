import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
          {change !== undefined && (
            <span
              className={cn(
                "mb-0.5 flex items-center gap-0.5 text-xs font-semibold",
                trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
              )}
            >
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
  const kpis: KpiCardProps[] = [
    { label: "Total Claims", value: "1,247", change: 12, trend: "up", subtitle: "This month" },
    { label: "Clean Claim Rate", value: "94.2%", change: 1.8, trend: "up", subtitle: "Target: 95%" },
    { label: "Avg Days in A/R", value: "34.5", change: -3.2, trend: "up", subtitle: "Target: <40 days" },
    { label: "Net Collection Rate", value: "96.8%", change: 0.5, trend: "up", subtitle: "Target: 98%" },
    { label: "Denial Rate", value: "5.4%", change: 0.8, trend: "down", subtitle: "Target: <5%" },
    { label: "Pending Amount", value: "$2.1M", change: -15, trend: "up", subtitle: "42 claims" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}
