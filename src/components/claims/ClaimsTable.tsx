import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { mockClaims, formatCurrency, formatClaimStatus, getClaimStatusColor } from "@/data/mock-claims";
import { Claim } from "@/types/rcm";
import { Search, Filter, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ClaimsTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [payerFilter, setPayerFilter] = useState<string>("all");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  const filtered = mockClaims.filter((c) => {
    const matchSearch =
      !search ||
      c.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      c.claim_number.toLowerCase().includes(search.toLowerCase()) ||
      c.payer_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.claim_status === statusFilter;
    const matchPayer = payerFilter === "all" || c.payer_id === payerFilter;
    return matchSearch && matchStatus && matchPayer;
  });

  const uniquePayers = [...new Map(mockClaims.map((c) => [c.payer_id, { id: c.payer_id, name: c.payer_name }])).values()];

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient, claim #, or payer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
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
            {uniquePayers.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} claims</span>
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
            {filtered.map((claim) => (
              <TableRow
                key={claim.claim_id}
                className="cursor-pointer hover:bg-muted/30"
                onClick={() => setSelectedClaim(claim)}
              >
                <TableCell className="font-mono text-xs font-medium">{claim.claim_number}</TableCell>
                <TableCell className="font-medium">{claim.patient_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{claim.payer_name}</TableCell>
                <TableCell className="text-sm">{claim.service_date}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(claim.total_charge_amount)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(claim.total_paid_amount)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-[11px] font-semibold border", getClaimStatusColor(claim.claim_status))}>
                    {formatClaimStatus(claim.claim_status)}
                  </Badge>
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
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No claims match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination placeholder */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {filtered.length} of {mockClaims.length} claims</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled className="h-8">
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </Button>
          <Button variant="outline" size="sm" className="h-8 bg-primary text-primary-foreground">1</Button>
          <Button variant="outline" size="sm" disabled className="h-8">
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
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
                  {selectedClaim.patient_name} · {selectedClaim.payer_name} · {selectedClaim.claim_type}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 pt-2">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-md border p-3">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Total Charges</p>
                    <p className="text-lg font-bold">{formatCurrency(selectedClaim.total_charge_amount)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Total Paid</p>
                    <p className="text-lg font-bold text-success">{formatCurrency(selectedClaim.total_paid_amount)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Patient Resp.</p>
                    <p className="text-lg font-bold">{formatCurrency(selectedClaim.patient_responsibility)}</p>
                  </div>
                </div>

                {/* Denial info */}
                {selectedClaim.denial_reason_code && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-xs font-semibold text-destructive">
                      Denial: {selectedClaim.denial_reason_code}
                    </p>
                    <p className="mt-0.5 text-sm text-foreground">{selectedClaim.denial_reason_description}</p>
                  </div>
                )}

                {/* Diagnoses */}
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diagnoses</h4>
                  <div className="space-y-1">
                    {selectedClaim.diagnoses.map((dx) => (
                      <div key={dx.code} className="flex items-center gap-2 text-sm">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium">{dx.code}</span>
                        <span>{dx.description}</span>
                        <Badge variant="outline" className="text-[10px]">{dx.rank}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Line Items */}
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
                      {selectedClaim.line_items.map((li) => (
                        <TableRow key={li.line_item_id}>
                          <TableCell className="font-mono text-xs">{li.procedure_code}</TableCell>
                          <TableCell className="text-sm">{li.procedure_description}</TableCell>
                          <TableCell className="text-right text-sm">{li.units}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrency(li.charge_amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-muted-foreground">Provider:</span> <span className="font-medium">{selectedClaim.provider_name}</span></div>
                  <div><span className="text-muted-foreground">Facility:</span> <span className="font-medium">{selectedClaim.facility_name}</span></div>
                  <div><span className="text-muted-foreground">Service Date:</span> <span className="font-medium">{selectedClaim.service_date}</span></div>
                  <div><span className="text-muted-foreground">Submitted:</span> <span className="font-medium">{selectedClaim.submission_date || "Not submitted"}</span></div>
                  {selectedClaim.days_in_ar > 0 && (
                    <div><span className="text-muted-foreground">Days in A/R:</span> <span className={cn("font-medium", selectedClaim.days_in_ar > 45 ? "text-destructive" : "")}>{selectedClaim.days_in_ar}</span></div>
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
