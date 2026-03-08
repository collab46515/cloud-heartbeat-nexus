import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Zap, AlertTriangle, CheckCircle, Loader2, Shield, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatClaimStatus, getClaimStatusColor } from "@/data/mock-claims";
import { useAIPrediction, useCodingSuggestions, type DenialPrediction, type CodingResult } from "@/hooks/useAIPrediction";
import { useRunScrub } from "@/hooks/useScrubbing";
import type { ClaimWithRelations } from "@/hooks/useClaims";
import { toast } from "sonner";

interface ClaimDetailPanelProps {
  claim: ClaimWithRelations;
  onClose: () => void;
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: "bg-success/15 text-success border-success/30",
    medium: "bg-warning/15 text-warning border-warning/30",
    high: "bg-destructive/15 text-destructive border-destructive/30",
    critical: "bg-destructive text-destructive-foreground",
  };
  return (
    <Badge variant="outline" className={cn("text-[11px] font-bold uppercase border", colors[level] || "")}>
      {level}
    </Badge>
  );
}

function RiskGauge({ probability }: { probability: number }) {
  const percent = Math.round(probability * 100);
  const color = percent > 70 ? "bg-destructive" : percent > 30 ? "bg-warning" : "bg-success";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Denial Probability</span>
        <span className="font-bold text-foreground">{percent}%</span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted">
        <div className={cn("h-3 rounded-full transition-all duration-700", color)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function ClaimDetailPanel({ claim, onClose }: ClaimDetailPanelProps) {
  const { predictDenial, prediction, loading: predicting } = useAIPrediction();
  const { getSuggestions, result: codingResult, loading: coding } = useCodingSuggestions();
  const runScrub = useRunScrub();
  const [clinicalText, setClinicalText] = useState("");

  const handleRunScrub = async () => {
    try {
      const result = await runScrub.mutateAsync(claim.id);
      toast.success(`Scrub: ${result.scrub_status} (${result.total_findings} findings)`);
    } catch (err: any) {
      toast.error(err.message || "Scrub failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-mono text-lg font-bold text-foreground">{claim.claim_number}</h3>
          <p className="text-sm text-muted-foreground">
            {claim.patients ? `${claim.patients.first_name} ${claim.patients.last_name}` : "Unknown"} · {claim.payers?.name}
          </p>
        </div>
        <Badge variant="outline" className={cn("text-[11px] font-semibold border", getClaimStatusColor(claim.claim_status))}>
          {formatClaimStatus(claim.claim_status)}
        </Badge>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Charges</p>
            <p className="text-lg font-bold">{formatCurrency(Number(claim.total_charge_amount))}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Paid</p>
            <p className="text-lg font-bold text-success">{formatCurrency(Number(claim.total_paid_amount))}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Patient Resp.</p>
            <p className="text-lg font-bold">{formatCurrency(Number(claim.patient_responsibility))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Denial Info */}
      {claim.denial_reason_code && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-xs font-semibold text-destructive">Denial: {claim.denial_reason_code}</p>
          <p className="mt-0.5 text-sm">{claim.denial_reason_description}</p>
        </div>
      )}

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="ai" className="flex-1 gap-1"><Brain className="h-3 w-3" /> AI Analysis</TabsTrigger>
          <TabsTrigger value="coding" className="flex-1 gap-1"><FileCode className="h-3 w-3" /> Coding</TabsTrigger>
          <TabsTrigger value="details" className="flex-1 gap-1"><Shield className="h-3 w-3" /> Details</TabsTrigger>
        </TabsList>

        {/* AI Analysis Tab */}
        <TabsContent value="ai" className="space-y-4 pt-2">
          <div className="flex gap-2">
            <Button onClick={() => predictDenial(claim.id)} disabled={predicting} size="sm" className="gap-1">
              {predicting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              {predicting ? "Analyzing…" : "Run Denial Prediction"}
            </Button>
            <Button onClick={handleRunScrub} disabled={runScrub.isPending} size="sm" variant="outline" className="gap-1">
              {runScrub.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
              {runScrub.isPending ? "Scrubbing…" : "Run Scrub"}
            </Button>
          </div>

          {/* Existing AI data from claim */}
          {(prediction || (claim as any).ai_risk_level) && (
            <AIRiskPanel prediction={prediction} claim={claim} />
          )}
        </TabsContent>

        {/* Coding Tab */}
        <TabsContent value="coding" className="space-y-4 pt-2">
          <Textarea
            placeholder="Paste clinical documentation here for NLP analysis (optional)…"
            value={clinicalText}
            onChange={(e) => setClinicalText(e.target.value)}
            className="min-h-[80px] text-xs"
          />
          <Button onClick={() => getSuggestions(claim.id, clinicalText || undefined)} disabled={coding} size="sm" className="gap-1">
            {coding ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileCode className="h-3 w-3" />}
            {coding ? "Analyzing…" : "Get Coding Suggestions"}
          </Button>

          {codingResult && <CodingSuggestionsPanel result={codingResult} />}

          {/* Current Codes */}
          {claim.diagnoses && Array.isArray(claim.diagnoses) && (claim.diagnoses as any[]).length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Diagnoses</h4>
              <div className="space-y-1">
                {(claim.diagnoses as any[]).map((dx: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium">{dx.code}</span>
                    <span>{dx.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {claim.claim_line_items?.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Line Items</h4>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">CPT</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">Charge</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claim.claim_line_items.map((li) => (
                    <TableRow key={li.id}>
                      <TableCell className="font-mono text-xs">{li.procedure_code}</TableCell>
                      <TableCell className="text-xs">{li.procedure_description}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(Number(li.charge_amount))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><span className="text-muted-foreground">Provider: </span><span className="font-medium">{claim.providers ? `Dr. ${claim.providers.first_name} ${claim.providers.last_name}` : "—"}</span></div>
            <div><span className="text-muted-foreground">Facility: </span><span className="font-medium">{claim.facility_name || "—"}</span></div>
            <div><span className="text-muted-foreground">Service Date: </span><span className="font-medium">{claim.service_date}</span></div>
            <div><span className="text-muted-foreground">Submitted: </span><span className="font-medium">{claim.submission_date || "Not submitted"}</span></div>
            <div><span className="text-muted-foreground">Claim Type: </span><span className="font-medium capitalize">{claim.claim_type}</span></div>
            <div><span className="text-muted-foreground">Days in A/R: </span><span className={cn("font-medium", claim.days_in_ar > 45 ? "text-destructive" : "")}>{claim.days_in_ar || "—"}</span></div>
            <div><span className="text-muted-foreground">Payer Type: </span><span className="font-medium capitalize">{claim.payers?.payer_type || "—"}</span></div>
            <div><span className="text-muted-foreground">MRN: </span><span className="font-mono font-medium">{claim.patients?.mrn || "—"}</span></div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AIRiskPanel({ prediction, claim }: { prediction: DenialPrediction | null; claim: ClaimWithRelations }) {
  const data = prediction || {
    denial_probability: (claim as any).ai_risk_score || 0,
    risk_level: (claim as any).ai_risk_level || "low",
    risk_factors: (claim as any).ai_risk_factors || [],
    recommended_actions: (claim as any).ai_recommended_actions || [],
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <RiskGauge probability={data.denial_probability} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Risk Level:</span>
        <RiskBadge level={data.risk_level} />
        {prediction?.latency_ms && (
          <span className="text-[10px] text-muted-foreground ml-auto">{prediction.latency_ms}ms</span>
        )}
      </div>

      {prediction?.revenue_at_risk && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2">
            <p className="text-[10px] uppercase text-muted-foreground">Revenue at Risk</p>
            <p className="text-sm font-bold text-destructive">{formatCurrency(prediction.revenue_at_risk)}</p>
          </div>
          {prediction.revenue_protected_if_fixed && (
            <div className="rounded-md border border-success/20 bg-success/5 p-2">
              <p className="text-[10px] uppercase text-muted-foreground">Protected if Fixed</p>
              <p className="text-sm font-bold text-success">{formatCurrency(prediction.revenue_protected_if_fixed)}</p>
            </div>
          )}
        </div>
      )}

      {data.risk_factors?.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risk Factors</h4>
          <div className="space-y-2">
            {data.risk_factors.map((rf: any, i: number) => (
              <div key={i} className="rounded-md border p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{rf.factor}</span>
                  <Badge variant="outline" className={cn("text-[10px]",
                    rf.score > 0.7 ? "border-destructive/30 text-destructive" :
                    rf.score > 0.4 ? "border-warning/30 text-warning" :
                    "border-muted-foreground/30 text-muted-foreground"
                  )}>
                    {Math.round(rf.score * 100)}%
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{rf.description}</p>
                {rf.affected_codes?.length > 0 && (
                  <div className="mt-1 flex gap-1">
                    {rf.affected_codes.map((c: string) => (
                      <span key={c} className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.recommended_actions?.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommended Actions</h4>
          <div className="space-y-1.5">
            {data.recommended_actions.map((action: any, i: number) => (
              <div key={i} className="flex items-start gap-2 rounded-md border p-2">
                {action.priority === "high" ? (
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                ) : (
                  <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <p className="text-xs font-medium text-foreground">{action.action}</p>
                  {action.estimated_impact && (
                    <p className="text-[10px] text-muted-foreground">{action.estimated_impact}</p>
                  )}
                </div>
                <Badge variant="outline" className={cn("ml-auto shrink-0 text-[10px]",
                  action.priority === "high" ? "border-destructive/30 text-destructive" :
                  action.priority === "medium" ? "border-warning/30 text-warning" : ""
                )}>
                  {action.priority}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CodingSuggestionsPanel({ result }: { result: CodingResult }) {
  return (
    <div className="space-y-4">
      {/* Score */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Coding Accuracy</span>
            <span className="font-bold">{Math.round(result.coding_accuracy_score * 100)}%</span>
          </div>
          <Progress value={result.coding_accuracy_score * 100} className="h-2" />
        </div>
        {result.total_revenue_impact && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Revenue Impact</p>
            <p className={cn("text-sm font-bold", result.total_revenue_impact > 0 ? "text-success" : "text-foreground")}>
              {result.total_revenue_impact > 0 ? "+" : ""}{formatCurrency(result.total_revenue_impact)}
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{result.overall_assessment}</p>

      {result.suggestions.map((s, i) => (
        <div key={i} className="rounded-md border p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] capitalize">{s.suggestion_type.replace("_", " ")}</Badge>
            <span className="text-[10px] font-medium text-muted-foreground">{Math.round(s.confidence * 100)}% confidence</span>
          </div>
          <div className="flex items-center gap-2">
            {s.current_code && (
              <>
                <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-xs text-destructive line-through">{s.current_code}</span>
                <span className="text-xs text-muted-foreground">→</span>
              </>
            )}
            <span className="rounded bg-success/10 px-1.5 py-0.5 font-mono text-xs text-success font-medium">{s.suggested_code}</span>
          </div>
          <p className="text-xs font-medium text-foreground">{s.suggested_description}</p>
          <p className="text-[10px] text-muted-foreground">{s.evidence}</p>
          {s.revenue_impact !== undefined && s.revenue_impact !== 0 && (
            <p className={cn("text-[10px] font-medium", s.revenue_impact > 0 ? "text-success" : "text-destructive")}>
              Revenue impact: {s.revenue_impact > 0 ? "+" : ""}{formatCurrency(s.revenue_impact)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
