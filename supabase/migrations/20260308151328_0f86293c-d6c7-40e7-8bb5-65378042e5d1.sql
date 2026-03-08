
-- Drop existing restrictive check constraints
ALTER TABLE scrub_rules DROP CONSTRAINT IF EXISTS scrub_rules_category_check;
ALTER TABLE scrub_rules DROP CONSTRAINT IF EXISTS scrub_rules_rule_type_check;

-- Add broader check constraints for full governance coverage
ALTER TABLE scrub_rules ADD CONSTRAINT scrub_rules_category_check CHECK (category IN (
  'cci', 'mue', 'lcd', 'ncd', 'modifier', 'age_gender', 'bundling', 'authorization',
  'timely_filing', 'medical_necessity', 'custom', 'demographics', 'diagnosis',
  'claim_header', 'provider', 'payer', 'charge', 'line_item', 'coding_edit',
  'units', 'modifier_edit', 'compliance', 'duplicate', 'clinical_validation',
  'hipaa', 'pos', 'cob'
));

ALTER TABLE scrub_rules ADD CONSTRAINT scrub_rules_rule_type_check CHECK (rule_type IN (
  'hard_edit', 'soft_edit', 'warning', 'info',
  'structural', 'cci', 'mue', 'modifier', 'ncci', 'payer_specific',
  'ai_clinical', 'charge_validation', 'compliance'
));
