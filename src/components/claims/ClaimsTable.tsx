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
      <div className="rounded-lg border overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-28">Claim #</TableHead>
              <TableHead className="w-28">Patient</TableHead>
              <TableHead className="w-24">Payer</TableHead>
              <TableHead className="w-24">DOS</TableHead>
              <TableHead className="text-right w-24">Charges</TableHead>
              <TableHead className="text-right w-20">Paid</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-20">Scrub</TableHead>
              <TableHead className="w-16 text-right">A/R</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.map((claim) => (
              <TableRow key={claim.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedClaim(claim)}>
                <TableCell className="font-mono text-xs font-medium">{claim.claim_number}</TableCell>
                <TableCell className="text-sm truncate max-w-[120px]">
                  {claim.patients ? `${claim.patients.first_name} ${claim.patients.last_name}` : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground truncate max-w-[100px]">{claim.payers?.name ?? "—"}</TableCell>
                <TableCell className="text-xs">{claim.service_date}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatCurrency(Number(claim.total_charge_amount))}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatCurrency(Number(claim.total_paid_amount))}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-[10px] font-semibold border", getClaimStatusColor(claim.claim_status))}>
                    {formatClaimStatus(claim.claim_status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-[10px] border capitalize",
                    (claim as any).scrub_status === "passed" ? "bg-success/15 text-success border-success/30" :
                    (claim as any).scrub_status === "failed" ? "bg-destructive/15 text-destructive border-destructive/30" :
                    (claim as any).scrub_status === "warnings" ? "bg-warning/15 text-warning border-warning/30" :
                    (claim as any).scrub_status === "running" ? "bg-info/15 text-info border-info/30" : ""
                  )}>
                    {(claim as any).scrub_status || "pending"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-xs">
                  {claim.days_in_ar > 0 ? (
                    <span className={cn(claim.days_in_ar > 45 ? "font-semibold text-destructive" : claim.days_in_ar > 30 ? "text-warning" : "text-foreground")}>
                      {claim.days_in_ar}
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Run Scrub" onClick={(e) => handleRunScrub(e, claim.id)} disabled={runScrub.isPending}>
                      <Shield className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="View Details">
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
