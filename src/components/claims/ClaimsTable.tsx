import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatCurrency, formatClaimStatus, getClaimStatusColor } from "@/data/mock-claims";
import { useClaims, usePayers, type ClaimWithRelations } from "@/hooks/useClaims";
import { useRunScrub } from "@/hooks/useScrubbing";
import { Search, Filter, Eye, Loader2, Brain, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClaimDetailPanel } from "./ClaimDetailPanel";
import { toast } from "sonner";

export function ClaimsTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [payerFilter, setPayerFilter] = useState<string>("all");
  const [selectedClaim, setSelectedClaim] = useState<ClaimWithRelations | null>(null);

  const { data: claims = [], isLoading } = useClaims({ status: statusFilter, payer_id: payerFilter, search });
  const { data: payers = [] } = usePayers();
  const runScrub = useRunScrub();

  const handleRunScrub = async (e: React.MouseEvent, claimId: string) => {
    e.stopPropagation();
    try {
      const result = await runScrub.mutateAsync(claimId);
      toast.success(`Scrub: ${result.scrub_status} (${result.total_findings} findings, ${result.errors} errors)`);
    } catch (err: any) {
      toast.error(err.message || "Scrub failed");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by patient, claim #, or payer…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <Filter className="mr-1 h-3 w-3" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["draft","scrubbing","submitted","acknowledged","pending","paid","partial_paid","denied","appealed"].map((s) => (
              <SelectItem key={s} value={s}>{formatClaimStatus(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={payerFilter} onValueChange={setPayerFilter}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="Payer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payers</SelectItem>
            {payers.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{claims.length} claims</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-36">Claim #</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Service Date</TableHead>
              <TableHead className="text-right">Charges</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>AI Risk</TableHead>
              <TableHead className="text-right">Days A/R</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.map((claim) => (
              <TableRow key={claim.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedClaim(claim)}>
                <TableCell className="font-mono text-xs font-medium">{claim.claim_number}</TableCell>
                <TableCell className="font-medium">
                  {claim.patients ? `${claim.patients.first_name} ${claim.patients.last_name}` : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{claim.payers?.name ?? "—"}</TableCell>
                <TableCell className="text-sm">{claim.service_date}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(claim.total_charge_amount))}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(claim.total_paid_amount))}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-[11px] font-semibold border", getClaimStatusColor(claim.claim_status))}>
                    {formatClaimStatus(claim.claim_status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {(claim as any).ai_risk_level && (claim as any).ai_risk_level !== "low" && (
                    <Badge variant="outline" className={cn("text-[10px] border gap-1",
                      (claim as any).ai_risk_level === "critical" ? "bg-destructive text-destructive-foreground" :
                      (claim as any).ai_risk_level === "high" ? "border-destructive/30 text-destructive" :
                      "border-warning/30 text-warning"
                    )}>
                      <Brain className="h-2.5 w-2.5" />
                      {(claim as any).ai_risk_level}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {claim.days_in_ar > 0 ? (
                    <span className={cn(claim.days_in_ar > 45 ? "font-semibold text-destructive" : claim.days_in_ar > 30 ? "text-warning" : "text-foreground")}>
                      {claim.days_in_ar}
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleRunScrub(e, claim.id)} disabled={runScrub.isPending}>
                      {runScrub.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {claims.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  No claims found. Seed data or create your first claim.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Claim Detail Sheet */}
      <Sheet open={!!selectedClaim} onOpenChange={(open) => !open && setSelectedClaim(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="sr-only">Claim Details</SheetTitle>
          </SheetHeader>
          {selectedClaim && (
            <ClaimDetailPanel claim={selectedClaim} onClose={() => setSelectedClaim(null)} />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
