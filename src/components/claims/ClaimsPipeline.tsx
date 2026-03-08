import { cn } from "@/lib/utils";
import { mockClaims } from "@/data/mock-claims";

const stages = [
  { key: "draft", label: "Draft", color: "bg-muted" },
  { key: "scrubbing", label: "Scrubbing", color: "bg-info" },
  { key: "submitted", label: "Submitted", color: "bg-primary" },
  { key: "acknowledged", label: "Acknowledged", color: "bg-info" },
  { key: "pending", label: "Pending", color: "bg-warning" },
  { key: "paid,partial_paid", label: "Paid", color: "bg-success" },
  { key: "denied", label: "Denied", color: "bg-destructive" },
  { key: "appealed", label: "Appealed", color: "bg-[hsl(280,60%,50%)]" },
];

export function ClaimsPipeline() {
  const counts = stages.map((s) => {
    const keys = s.key.split(",");
    return {
      ...s,
      count: mockClaims.filter((c) => keys.includes(c.claim_status)).length,
    };
  });

  const max = Math.max(...counts.map((c) => c.count), 1);

  return (
    <div className="flex items-end gap-2">
      {counts.map((stage) => (
        <div key={stage.key} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-bold text-foreground">{stage.count}</span>
          <div
            className={cn("w-full rounded-t-sm transition-all", stage.color)}
            style={{ height: `${Math.max((stage.count / max) * 64, 8)}px` }}
          />
          <span className="text-[10px] font-medium text-muted-foreground">{stage.label}</span>
        </div>
      ))}
    </div>
  );
}
