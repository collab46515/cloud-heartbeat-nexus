import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, AlertTriangle, Clock, Loader2, Zap, ArrowUpDown, Target } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TriagedClaim {
  id: string;
  claim_number: string;
  patient_name: string;
  payer_name: string;
  total_charge_amount: number;
  days_in_ar: number;
  claim_status: string;
  ai_risk_score: number;
  ai_risk_level: string;
  priority_score: number;
  priority_reason: string;
  recommended_action: string;
}

function useTriagedClaims() {
  return useQuery({
    queryKey: ["exception-triage"],
    queryFn: async () => {
      const { data: claims } = await supabase
        .from("claims")
        .select("id, claim_number, claim_status, total_charge_amount, days_in_ar, ai_risk_score, ai_risk_level, timely_filing_deadline, patient_id, payer_id, patients(first_name, last_name), payers(name)")
        .in("claim_status", ["denied", "pending", "scrubbing", "submitted", "appealed"])
        .order("days_in_ar", { ascending: false })
        .limit(100);

      // AI-powered priority scoring
      return (claims || []).map((c: any) => {
        let score = 0;
        let reasons: string[] = [];
        let action = "Review";

        // High dollar
        if (Number(c.total_charge_amount) > 5000) { score += 30; reasons.push("High value"); }
        else if (Number(c.total_charge_amount) > 1000) { score += 15; reasons.push("Medium value"); }

        // Days in AR
        if (c.days_in_ar > 60) { score += 35; reasons.push("Aged >60d"); action = "Urgent follow-up"; }
        else if (c.days_in_ar > 30) { score += 20; reasons.push("Aged >30d"); }

        // Denial
        if (c.claim_status === "denied") { score += 25; reasons.push("Denied"); action = "Appeal/Correct"; }
        if (c.claim_status === "appealed") { score += 15; reasons.push("In appeal"); action = "Monitor appeal"; }

        // AI risk
        if (Number(c.ai_risk_score) > 70) { score += 20; reasons.push("High AI risk"); }

        // Timely filing
        if (c.timely_filing_deadline) {
          const daysLeft = Math.floor((new Date(c.timely_filing_deadline).getTime() - Date.now()) / 86400000);
          if (daysLeft < 7) { score += 40; reasons.push(`Filing ${daysLeft}d left!`); action = "URGENT: Submit immediately"; }
          else if (daysLeft < 30) { score += 15; reasons.push(`Filing ${daysLeft}d left`); }
        }

        return {
          id: c.id,
          claim_number: c.claim_number,
          patient_name: c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : "—",
          payer_name: c.payers?.name || "—",
          total_charge_amount: Number(c.total_charge_amount),
          days_in_ar: c.days_in_ar,
          claim_status: c.claim_status,
          ai_risk_score: Number(c.ai_risk_score),
          ai_risk_level: c.ai_risk_level || "low",
          priority_score: Math.min(score, 100),
          priority_reason: reasons.join(" · "),
          recommended_action: action,
        } as TriagedClaim;
      }).sort((a, b) => b.priority_score - a.priority_score);
    },
  });
}

const priorityColor = (score: number) =>
  score >= 75 ? "text-destructive" : score >= 50 ? "text-warning" : score >= 25 ? "text-info" : "text-muted-foreground";

const priorityBg = (score: number) =>
  score >= 75 ? "bg-destructive/10 border-destructive/30" : score >= 50 ? "bg-warning/10 border-warning/30" : score >= 25 ? "bg-info/10 border-info/30" : "bg-muted border-border";

export default function ExceptionTriage() {
  const { data: claims = [], isLoading } = useTriagedClaims();

  const critical = claims.filter(c => c.priority_score >= 75).length;
  const high = claims.filter(c => c.priority_score >= 50 && c.priority_score < 75).length;
  const medium = claims.filter(c => c.priority_score >= 25 && c.priority_score < 50).length;
  const totalAtRisk = claims.reduce((s, c) => s + (c.priority_score >= 50 ? c.total_charge_amount : 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Exception Triage AI</h1>
        <p className="text-sm text-muted-foreground">AI-powered intelligent work prioritization based on revenue impact, aging, and risk scoring.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Exceptions</p><p className="mt-1 text-2xl font-bold">{claims.length}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-destructive">Critical</p><p className="mt-1 text-2xl font-bold text-destructive">{critical}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-warning">High Priority</p><p className="mt-1 text-2xl font-bold text-warning">{high}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-info">Medium</p><p className="mt-1 text-2xl font-bold text-info">{medium}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Revenue at Risk</p><p className="mt-1 text-2xl font-bold">${totalAtRisk.toLocaleString("en", { maximumFractionDigits: 0 })}</p></CardContent></Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : claims.length === 0 ? (
        <Card className="border-border/60"><CardContent className="p-8 text-center">
          <Brain className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No exceptions to triage</p>
          <p className="text-xs text-muted-foreground">All claims are on track — great job!</p>
        </CardContent></Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead className="w-16">Priority</TableHead>
              <TableHead>Claim</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Days A/R</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Risk Factors</TableHead>
              <TableHead>Recommended Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {claims.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className={cn("flex items-center justify-center rounded-full border w-10 h-10 text-xs font-bold", priorityBg(c.priority_score), priorityColor(c.priority_score))}>
                      {c.priority_score}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.claim_number}</TableCell>
                  <TableCell className="text-sm">{c.patient_name}</TableCell>
                  <TableCell className="text-sm">{c.payer_name}</TableCell>
                  <TableCell className="text-sm font-medium">${c.total_charge_amount.toLocaleString()}</TableCell>
                  <TableCell className={cn("text-sm font-medium", c.days_in_ar > 60 ? "text-destructive" : c.days_in_ar > 30 ? "text-warning" : "")}>{c.days_in_ar}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] capitalize">{c.claim_status}</Badge></TableCell>
                  <TableCell className="text-[10px] text-muted-foreground max-w-[180px]">{c.priority_reason}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px]", c.priority_score >= 75 ? "border-destructive/50 text-destructive" : "")}>{c.recommended_action}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
