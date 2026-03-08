import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatCurrency, formatClaimStatus, getClaimStatusColor } from "@/data/mock-claims";
import { useClaims, usePayers, type ClaimWithRelations } from "@/hooks/useClaims";
import { Search, Filter, Eye, Loader2, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClaimDetailPanel } from "./ClaimDetailPanel";

export function ClaimsTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [payerFilter, setPayerFilter] = useState<string>("all");
  const [selectedClaim, setSelectedClaim] = useState<ClaimWithRelations | null>(null);

  const { data: claims = [], isLoading } = useClaims({ status: statusFilter, payer_id: payerFilter, search });
  const { data: payers = [] } = usePayers();

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
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {claims.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No claims found. Seed data or create your first claim.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Claim Detail Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={(open) => !open && setSelectedClaim(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedClaim && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="font-mono">{selectedClaim.claim_number}</span>
                  <Badge variant="outline" className={cn("text-[11px] font-semibold border", getClaimStatusColor(selectedClaim.claim_status))}>
                    {formatClaimStatus(selectedClaim.claim_status)}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedClaim.patients ? `${selectedClaim.patients.first_name} ${selectedClaim.patients.last_name}` : "Unknown"} · {selectedClaim.payers?.name} · {selectedClaim.claim_type}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 pt-2">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-md border p-3">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Total Charges</p>
                    <p className="text-lg font-bold">{formatCurrency(Number(selectedClaim.total_charge_amount))}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Total Paid</p>
                    <p className="text-lg font-bold text-success">{formatCurrency(Number(selectedClaim.total_paid_amount))}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Patient Resp.</p>
                    <p className="text-lg font-bold">{formatCurrency(Number(selectedClaim.patient_responsibility))}</p>
                  </div>
                </div>

                {selectedClaim.denial_reason_code && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-xs font-semibold text-destructive">Denial: {selectedClaim.denial_reason_code}</p>
                    <p className="mt-0.5 text-sm text-foreground">{selectedClaim.denial_reason_description}</p>
                  </div>
                )}

                {/* Diagnoses from JSONB */}
                {selectedClaim.diagnoses && Array.isArray(selectedClaim.diagnoses) && (selectedClaim.diagnoses as any[]).length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diagnoses</h4>
                    <div className="space-y-1">
                      {(selectedClaim.diagnoses as any[]).map((dx: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium">{dx.code}</span>
                          <span>{dx.description}</span>
                          {dx.rank && <Badge variant="outline" className="text-[10px]">{dx.rank}</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Line Items */}
                {selectedClaim.claim_line_items?.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Line Items</h4>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">CPT</TableHead>
                          <TableHead className="text-xs">Description</TableHead>
                          <TableHead className="text-xs text-right">Units</TableHead>
                          <TableHead className="text-xs text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedClaim.claim_line_items.map((li) => (
                          <TableRow key={li.id}>
                            <TableCell className="font-mono text-xs">{li.procedure_code}</TableCell>
                            <TableCell className="text-sm">{li.procedure_description}</TableCell>
                            <TableCell className="text-right text-sm">{li.units}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(li.charge_amount))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Provider: </span>
                    <span className="font-medium">
                      {selectedClaim.providers ? `Dr. ${selectedClaim.providers.first_name} ${selectedClaim.providers.last_name}` : "—"}
                    </span>
                  </div>
                  <div><span className="text-muted-foreground">Facility: </span><span className="font-medium">{selectedClaim.facility_name || "—"}</span></div>
                  <div><span className="text-muted-foreground">Service Date: </span><span className="font-medium">{selectedClaim.service_date}</span></div>
                  <div><span className="text-muted-foreground">Submitted: </span><span className="font-medium">{selectedClaim.submission_date || "Not submitted"}</span></div>
                  {selectedClaim.days_in_ar > 0 && (
                    <div>
                      <span className="text-muted-foreground">Days in A/R: </span>
                      <span className={cn("font-medium", selectedClaim.days_in_ar > 45 ? "text-destructive" : "")}>{selectedClaim.days_in_ar}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
