import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ruleTypeOptions = [
  "hard_edit",
  "soft_edit",
  "warning",
  "info",
  "structural",
  "cci",
  "mue",
  "modifier",
  "ncci",
  "payer_specific",
  "ai_clinical",
  "charge_validation",
  "compliance",
];

const categoryOptions = [
  "cci",
  "mue",
  "lcd",
  "ncd",
  "modifier",
  "age_gender",
  "bundling",
  "authorization",
  "timely_filing",
  "medical_necessity",
  "custom",
  "demographics",
  "diagnosis",
  "claim_header",
  "provider",
  "payer",
  "charge",
  "line_item",
  "coding_edit",
  "units",
  "modifier_edit",
  "compliance",
  "duplicate",
  "clinical_validation",
  "hipaa",
  "pos",
  "cob",
];

type RuleForm = {
  id?: string;
  rule_code: string;
  rule_name: string;
  rule_type: string;
  category: string;
  severity: "error" | "warning" | "info";
  description: string;
  logic_expression_text: string;
  auto_correct: boolean;
  auto_correct_action_text: string;
  is_active: boolean;
};

const defaultRule: RuleForm = {
  rule_code: "",
  rule_name: "",
  rule_type: "hard_edit",
  category: "custom",
  severity: "error",
  description: "",
  logic_expression_text: '{\n  "check": "custom_check"\n}',
  auto_correct: false,
  auto_correct_action_text: "",
  is_active: true,
};

export function RuleEditorDialog({
  open,
  onOpenChange,
  rule,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: any;
  onSave: (payload: any) => Promise<void>;
  pending?: boolean;
}) {
  const [form, setForm] = useState<RuleForm>(defaultRule);

  const isEdit = useMemo(() => Boolean(rule?.id), [rule?.id]);

  useEffect(() => {
    if (!rule) {
      setForm(defaultRule);
      return;
    }

    setForm({
      id: rule.id,
      rule_code: rule.rule_code ?? "",
      rule_name: rule.rule_name ?? "",
      rule_type: rule.rule_type ?? "hard_edit",
      category: rule.category ?? "custom",
      severity: rule.severity ?? "error",
      description: rule.description ?? "",
      logic_expression_text: JSON.stringify(rule.logic_expression ?? {}, null, 2),
      auto_correct: Boolean(rule.auto_correct),
      auto_correct_action_text: rule.auto_correct_action ? JSON.stringify(rule.auto_correct_action, null, 2) : "",
      is_active: Boolean(rule.is_active),
    });
  }, [rule]);

  const handleSubmit = async () => {
    try {
      const logic_expression = JSON.parse(form.logic_expression_text || "{}");
      const auto_correct_action = form.auto_correct_action_text ? JSON.parse(form.auto_correct_action_text) : null;

      await onSave({
        id: form.id,
        rule_code: form.rule_code.trim(),
        rule_name: form.rule_name.trim(),
        rule_type: form.rule_type,
        category: form.category,
        severity: form.severity,
        description: form.description.trim() || null,
        logic_expression,
        auto_correct: form.auto_correct,
        auto_correct_action,
        is_active: form.is_active,
      });

      onOpenChange(false);
      toast.success(isEdit ? "Rule updated" : "Rule created");
    } catch (err: any) {
      toast.error(err?.message || "Invalid JSON in logic/action fields");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Scrub Rule" : "Create Scrub Rule"}</DialogTitle>
          <DialogDescription>Define governed logic_expression and optional auto-correct action.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Rule Code</Label>
            <Input value={form.rule_code} onChange={(e) => setForm((p) => ({ ...p, rule_code: e.target.value }))} placeholder="CCI-004" />
          </div>
          <div className="space-y-2">
            <Label>Rule Name</Label>
            <Input value={form.rule_name} onChange={(e) => setForm((p) => ({ ...p, rule_name: e.target.value }))} placeholder="New CCI Pair Validation" />
          </div>

          <div className="space-y-2">
            <Label>Rule Type</Label>
            <Select value={form.rule_type} onValueChange={(v) => setForm((p) => ({ ...p, rule_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ruleTypeOptions.map((o) => <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoryOptions.map((o) => <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={(v: "error" | "warning" | "info") => setForm((p) => ({ ...p, severity: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="error">error</SelectItem>
                <SelectItem value="warning">warning</SelectItem>
                <SelectItem value="info">info</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2 md:mt-7">
            <Label htmlFor="rule-active">Active</Label>
            <Switch id="rule-active" checked={form.is_active} onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Rule description..." />
        </div>

        <div className="space-y-2">
          <Label>Logic Expression (JSON)</Label>
          <Textarea
            className="min-h-[140px] font-mono text-xs"
            value={form.logic_expression_text}
            onChange={(e) => setForm((p) => ({ ...p, logic_expression_text: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Auto-Correct</Label>
            <Switch checked={form.auto_correct} onCheckedChange={(checked) => setForm((p) => ({ ...p, auto_correct: checked }))} />
          </div>
          <Textarea
            className="min-h-[100px] font-mono text-xs"
            placeholder='{"action":"set_default","field":"claim_type","value":"professional"}'
            value={form.auto_correct_action_text}
            onChange={(e) => setForm((p) => ({ ...p, auto_correct_action_text: e.target.value }))}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={pending || !form.rule_code || !form.rule_name}>
            {pending ? "Saving..." : isEdit ? "Save Changes" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
