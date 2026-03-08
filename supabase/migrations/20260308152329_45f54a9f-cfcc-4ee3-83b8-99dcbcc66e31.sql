-- Governance reference tables for real CCI/MUE/NCCI evaluation
CREATE TABLE IF NOT EXISTS public.cci_edit_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_1 text NOT NULL,
  code_2 text NOT NULL,
  edit_type text NOT NULL DEFAULT 'column_1_2',
  modifier_allowed boolean NOT NULL DEFAULT false,
  modifier_indicators text[] NOT NULL DEFAULT '{}',
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_1, code_2, edit_type)
);

CREATE TABLE IF NOT EXISTS public.ncci_edit_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_code text NOT NULL,
  secondary_code text NOT NULL,
  edit_reason text,
  modifier_allowed boolean NOT NULL DEFAULT false,
  modifier_indicators text[] NOT NULL DEFAULT '{}',
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (primary_code, secondary_code)
);

CREATE TABLE IF NOT EXISTS public.mue_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_code text NOT NULL UNIQUE,
  max_units integer NOT NULL,
  adjudication_indicator text NOT NULL DEFAULT 'MAI-1',
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.revenue_code_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_code text NOT NULL UNIQUE,
  revenue_code text NOT NULL,
  note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cci_edit_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ncci_edit_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mue_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_code_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth users can read cci_edit_pairs" ON public.cci_edit_pairs;
CREATE POLICY "Auth users can read cci_edit_pairs" ON public.cci_edit_pairs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage cci_edit_pairs" ON public.cci_edit_pairs;
CREATE POLICY "Admins manage cci_edit_pairs" ON public.cci_edit_pairs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Auth users can read ncci_edit_pairs" ON public.ncci_edit_pairs;
CREATE POLICY "Auth users can read ncci_edit_pairs" ON public.ncci_edit_pairs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage ncci_edit_pairs" ON public.ncci_edit_pairs;
CREATE POLICY "Admins manage ncci_edit_pairs" ON public.ncci_edit_pairs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Auth users can read mue_limits" ON public.mue_limits;
CREATE POLICY "Auth users can read mue_limits" ON public.mue_limits FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage mue_limits" ON public.mue_limits;
CREATE POLICY "Admins manage mue_limits" ON public.mue_limits FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Auth users can read revenue_code_defaults" ON public.revenue_code_defaults;
CREATE POLICY "Auth users can read revenue_code_defaults" ON public.revenue_code_defaults FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage revenue_code_defaults" ON public.revenue_code_defaults;
CREATE POLICY "Admins manage revenue_code_defaults" ON public.revenue_code_defaults FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Rule governance enhancements
ALTER TABLE public.scrub_rules
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS governance_tags text[] NOT NULL DEFAULT '{}';

DROP POLICY IF EXISTS "Admins can manage scrub_rules" ON public.scrub_rules;
DROP POLICY IF EXISTS "Rule owners and admins can manage scrub_rules" ON public.scrub_rules;
CREATE POLICY "Rule owners and admins can manage scrub_rules"
ON public.scrub_rules
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR created_by = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR created_by = auth.uid()
);

-- Expand checks to support operational and governed rule types
ALTER TABLE public.scrub_rules DROP CONSTRAINT IF EXISTS scrub_rules_category_check;
ALTER TABLE public.scrub_rules DROP CONSTRAINT IF EXISTS scrub_rules_rule_type_check;

ALTER TABLE public.scrub_rules
ADD CONSTRAINT scrub_rules_category_check
CHECK (category = ANY (ARRAY[
  'cci','mue','lcd','ncd','modifier','age_gender','bundling','authorization','timely_filing','medical_necessity','custom',
  'demographics','diagnosis','claim_header','provider','payer','charge','line_item','coding_edit','units','modifier_edit',
  'compliance','duplicate','clinical_validation','hipaa','pos','cob'
]));

ALTER TABLE public.scrub_rules
ADD CONSTRAINT scrub_rules_rule_type_check
CHECK (rule_type = ANY (ARRAY[
  'hard_edit','soft_edit','warning','info',
  'structural','cci','mue','modifier','ncci','payer_specific','ai_clinical','charge_validation','compliance'
]));

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_cci_edit_pairs_active ON public.cci_edit_pairs(code_1, code_2) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ncci_edit_pairs_active ON public.ncci_edit_pairs(primary_code, secondary_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mue_limits_active ON public.mue_limits(procedure_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_revenue_defaults_active ON public.revenue_code_defaults(procedure_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scrub_rules_active_type ON public.scrub_rules(is_active, rule_type);
