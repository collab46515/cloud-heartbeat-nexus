
-- ================================================================
-- PHASE 1: Core RCM Advanced Tables
-- ================================================================

-- 1. Payer Contracts & Fee Schedules
CREATE TABLE public.payer_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID REFERENCES public.payers(id) NOT NULL,
  contract_name TEXT NOT NULL,
  contract_number TEXT,
  effective_date DATE NOT NULL,
  termination_date DATE,
  auto_renew BOOLEAN DEFAULT true,
  contract_type TEXT NOT NULL DEFAULT 'fee_for_service' CHECK (contract_type IN ('fee_for_service','capitation','value_based','bundled','percent_of_charge')),
  reimbursement_basis TEXT DEFAULT 'fee_schedule' CHECK (reimbursement_basis IN ('fee_schedule','percent_of_medicare','percent_of_charge','drg','per_diem','case_rate')),
  medicare_percent NUMERIC DEFAULT 100,
  charge_percent NUMERIC DEFAULT 80,
  timely_filing_days INTEGER DEFAULT 90,
  appeal_filing_days INTEGER DEFAULT 60,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.fee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.payer_contracts(id) ON DELETE CASCADE NOT NULL,
  procedure_code TEXT NOT NULL,
  modifier TEXT DEFAULT '',
  allowed_amount NUMERIC NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL,
  end_date DATE,
  place_of_service TEXT DEFAULT '11',
  facility_rate NUMERIC,
  non_facility_rate NUMERIC,
  multiple_procedure_percent NUMERIC DEFAULT 100,
  bilateral_percent NUMERIC DEFAULT 150,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Scrub Rules Engine
CREATE TABLE public.scrub_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code TEXT NOT NULL UNIQUE,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('hard_edit','soft_edit','warning','info')),
  category TEXT NOT NULL CHECK (category IN ('cci','mue','lcd','ncd','modifier','age_gender','bundling','authorization','timely_filing','medical_necessity','custom')),
  description TEXT,
  logic_expression JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('error','warning','info')),
  auto_correct BOOLEAN DEFAULT false,
  auto_correct_action JSONB,
  payer_specific BOOLEAN DEFAULT false,
  payer_id UUID REFERENCES public.payers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.scrub_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  rule_id UUID REFERENCES public.scrub_rules(id),
  rule_code TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'error',
  line_item_id UUID REFERENCES public.claim_line_items(id),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  auto_corrected BOOLEAN DEFAULT false,
  correction_applied TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Payer RTA Configuration
CREATE TABLE public.payer_rta_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID REFERENCES public.payers(id) NOT NULL UNIQUE,
  rta_enabled BOOLEAN DEFAULT false,
  api_endpoint TEXT,
  api_version TEXT DEFAULT 'v1',
  auth_type TEXT DEFAULT 'oauth2' CHECK (auth_type IN ('oauth2','api_key','jwt','mtls')),
  max_charge_amount NUMERIC DEFAULT 50000,
  supported_claim_types TEXT[] DEFAULT ARRAY['professional'],
  excluded_procedure_categories TEXT[] DEFAULT '{}',
  timeout_seconds INTEGER DEFAULT 3,
  retry_count INTEGER DEFAULT 1,
  fallback_to_batch BOOLEAN DEFAULT true,
  avg_response_time_ms INTEGER,
  success_rate NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ML Predictions (AI Denial Prevention)
CREATE TABLE public.ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  prediction_type TEXT NOT NULL DEFAULT 'denial_risk' CHECK (prediction_type IN ('denial_risk','payment_estimate','coding_suggestion','rta_eligibility')),
  model_version TEXT DEFAULT '1.0.0',
  denial_probability NUMERIC NOT NULL DEFAULT 0 CHECK (denial_probability >= 0 AND denial_probability <= 1),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high','critical')),
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  risk_factors JSONB DEFAULT '[]',
  recommended_actions JSONB DEFAULT '[]',
  feature_importances JSONB DEFAULT '{}',
  actual_outcome TEXT,
  outcome_captured_at TIMESTAMPTZ,
  prediction_latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Coding Suggestions (NLP Engine)
CREATE TABLE public.coding_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES public.encounters(id),
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('diagnosis','procedure','modifier','cdi_query','e_m_level')),
  current_code TEXT,
  suggested_code TEXT NOT NULL,
  suggested_description TEXT,
  confidence NUMERIC NOT NULL DEFAULT 0,
  evidence TEXT,
  clinical_section TEXT,
  revenue_impact NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','modified')),
  accepted_by UUID,
  accepted_at TIMESTAMPTZ,
  rejection_reason TEXT,
  model_version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Timely Filing Alerts
CREATE TABLE public.timely_filing_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  payer_id UUID REFERENCES public.payers(id) NOT NULL,
  filing_deadline DATE NOT NULL,
  days_remaining INTEGER NOT NULL,
  alert_level TEXT NOT NULL DEFAULT 'green' CHECK (alert_level IN ('green','yellow','red','critical','expired')),
  has_exception BOOLEAN DEFAULT false,
  exception_type TEXT,
  exception_reason TEXT,
  extended_deadline DATE,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Denial Workflows
CREATE TABLE public.denial_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  denial_category TEXT NOT NULL CHECK (denial_category IN ('clinical','technical','authorization','eligibility','duplicate','timely_filing','bundling','coding','other')),
  carc_code TEXT,
  rarc_code TEXT,
  carc_description TEXT,
  rarc_description TEXT,
  group_code TEXT CHECK (group_code IN ('CO','PR','OA','PI','CR')),
  denial_amount NUMERIC NOT NULL DEFAULT 0,
  appeal_level INTEGER DEFAULT 0,
  appeal_status TEXT DEFAULT 'new' CHECK (appeal_status IN ('new','in_review','appeal_drafted','appeal_submitted','appeal_approved','appeal_denied','write_off_requested','write_off_approved','closed')),
  assigned_to UUID,
  escalated_to UUID,
  escalation_reason TEXT,
  appeal_letter TEXT,
  appeal_deadline DATE,
  write_off_amount NUMERIC DEFAULT 0,
  write_off_approved_by UUID,
  write_off_approved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Attachments / Clinical Documents
CREATE TABLE public.claim_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  attachment_type TEXT NOT NULL CHECK (attachment_type IN ('clinical_note','operative_report','prior_auth','medical_records','lab_results','radiology','pathology','referral','eob','correspondence','appeal_letter','other')),
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  pwk_report_type TEXT,
  pwk_transmission_code TEXT DEFAULT 'EL',
  uploaded_by UUID,
  description TEXT,
  is_submitted_to_payer BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Credit Balances
CREATE TABLE public.credit_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  payer_id UUID REFERENCES public.payers(id),
  credit_type TEXT NOT NULL CHECK (credit_type IN ('overpayment_payer','overpayment_patient','duplicate_payment','adjustment','refund_due')),
  amount NUMERIC NOT NULL DEFAULT 0,
  original_payment_date DATE,
  identified_date DATE NOT NULL DEFAULT CURRENT_DATE,
  refund_status TEXT NOT NULL DEFAULT 'identified' CHECK (refund_status IN ('identified','under_review','refund_requested','refund_approved','refund_issued','closed','disputed')),
  refund_method TEXT,
  refund_check_number TEXT,
  refund_issued_date DATE,
  refund_amount NUMERIC DEFAULT 0,
  compliance_deadline DATE,
  is_medicare_60_day BOOLEAN DEFAULT false,
  reviewed_by UUID,
  approved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Batch Submissions
CREATE TABLE public.batch_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL UNIQUE,
  batch_type TEXT NOT NULL DEFAULT '837P' CHECK (batch_type IN ('837P','837I','837D','paper_1500','paper_ub04')),
  payer_id UUID REFERENCES public.payers(id),
  clearinghouse TEXT,
  claim_count INTEGER DEFAULT 0,
  total_charges NUMERIC DEFAULT 0,
  submission_method TEXT DEFAULT 'edi' CHECK (submission_method IN ('edi','api','portal','paper','fax')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generating','validating','submitted','accepted','rejected','partial_accept','acknowledged')),
  submitted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  edi_file_path TEXT,
  acknowledgment_file_path TEXT,
  error_count INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.batch_claim_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.batch_submissions(id) ON DELETE CASCADE NOT NULL,
  claim_id UUID REFERENCES public.claims(id) NOT NULL,
  line_number INTEGER NOT NULL,
  status TEXT DEFAULT 'included' CHECK (status IN ('included','excluded','error','accepted','rejected')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Workload Queues
CREATE TABLE public.workload_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name TEXT NOT NULL UNIQUE,
  queue_type TEXT NOT NULL CHECK (queue_type IN ('scrub_review','denial_management','payment_posting','authorization','coding_review','general','high_dollar','aging_ar','credit_balance')),
  description TEXT,
  priority INTEGER DEFAULT 5,
  auto_assign BOOLEAN DEFAULT false,
  max_items_per_user INTEGER DEFAULT 50,
  escalation_hours INTEGER DEFAULT 48,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.workload_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES public.workload_queues(id) ON DELETE CASCADE NOT NULL,
  claim_id UUID REFERENCES public.claims(id),
  entity_type TEXT NOT NULL DEFAULT 'claim' CHECK (entity_type IN ('claim','denial','appeal','credit_balance','authorization','coding_review')),
  entity_id UUID NOT NULL,
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  assigned_to UUID,
  assigned_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','on_hold','completed','escalated','reassigned')),
  due_date TIMESTAMPTZ,
  escalated BOOLEAN DEFAULT false,
  escalated_to UUID,
  escalated_at TIMESTAMPTZ,
  completion_notes TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Claim Audit Log (Hash-Chained)
CREATE TABLE public.claim_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  action_category TEXT NOT NULL CHECK (action_category IN ('status_change','field_update','submission','payment','denial','appeal','attachment','scrub','ai_prediction','rta','assignment','note')),
  previous_value JSONB,
  new_value JSONB,
  user_id UUID,
  user_name TEXT,
  ip_address TEXT,
  hipaa_reason TEXT,
  phi_accessed BOOLEAN DEFAULT false,
  previous_hash TEXT,
  record_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. RTA Transactions
CREATE TABLE public.rta_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  payer_id UUID REFERENCES public.payers(id) NOT NULL,
  transaction_id TEXT UNIQUE,
  request_payload JSONB,
  response_payload JSONB,
  response_status TEXT NOT NULL CHECK (response_status IN ('approved','denied','pended','error','timeout')),
  adjudication_id TEXT,
  total_allowed NUMERIC DEFAULT 0,
  total_adjustment NUMERIC DEFAULT 0,
  deductible_applied NUMERIC DEFAULT 0,
  coinsurance NUMERIC DEFAULT 0,
  copay NUMERIC DEFAULT 0,
  patient_responsibility NUMERIC DEFAULT 0,
  plan_pays NUMERIC DEFAULT 0,
  payment_method TEXT,
  estimated_payment_date DATE,
  payment_confirmation TEXT,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Patient Financial / Payment Plans
CREATE TABLE public.patient_payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  claim_id UUID REFERENCES public.claims(id),
  total_balance NUMERIC NOT NULL DEFAULT 0,
  monthly_amount NUMERIC NOT NULL DEFAULT 0,
  number_of_payments INTEGER NOT NULL DEFAULT 3,
  interest_rate NUMERIC DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','defaulted','cancelled','paused')),
  payments_made INTEGER DEFAULT 0,
  remaining_balance NUMERIC NOT NULL DEFAULT 0,
  next_payment_date DATE,
  payment_method TEXT,
  auto_pay BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  claim_id UUID REFERENCES public.claims(id),
  payment_plan_id UUID REFERENCES public.patient_payment_plans(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('credit_card','debit_card','ach','check','cash','apple_pay','google_pay','hsa','fsa','venmo','other')),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','refunded','voided')),
  receipt_sent BOOLEAN DEFAULT false,
  receipt_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Add AI columns to claims table
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS ai_risk_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_risk_level TEXT DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS ai_risk_factors JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ai_recommended_actions JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS rta_eligible BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rta_status TEXT,
  ADD COLUMN IF NOT EXISTS batch_id UUID,
  ADD COLUMN IF NOT EXISTS scrub_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS scrub_passed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS appeal_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS timely_filing_deadline DATE,
  ADD COLUMN IF NOT EXISTS expected_payment NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contract_id UUID;

-- 16. Enable RLS on all new tables
ALTER TABLE public.payer_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrub_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrub_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payer_rta_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timely_filing_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.denial_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_claim_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workload_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workload_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rta_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_payments ENABLE ROW LEVEL SECURITY;

-- 17. RLS Policies (authenticated users can CRUD)
-- Payer Contracts
CREATE POLICY "Auth users can read payer_contracts" ON public.payer_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert payer_contracts" ON public.payer_contracts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update payer_contracts" ON public.payer_contracts FOR UPDATE TO authenticated USING (true);

-- Fee Schedules
CREATE POLICY "Auth users can read fee_schedules" ON public.fee_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert fee_schedules" ON public.fee_schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update fee_schedules" ON public.fee_schedules FOR UPDATE TO authenticated USING (true);

-- Scrub Rules
CREATE POLICY "Auth users can read scrub_rules" ON public.scrub_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage scrub_rules" ON public.scrub_rules FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Scrub Results
CREATE POLICY "Auth users can read scrub_results" ON public.scrub_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert scrub_results" ON public.scrub_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update scrub_results" ON public.scrub_results FOR UPDATE TO authenticated USING (true);

-- Payer RTA Config
CREATE POLICY "Auth users can read payer_rta_config" ON public.payer_rta_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage payer_rta_config" ON public.payer_rta_config FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- ML Predictions
CREATE POLICY "Auth users can read ml_predictions" ON public.ml_predictions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert ml_predictions" ON public.ml_predictions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update ml_predictions" ON public.ml_predictions FOR UPDATE TO authenticated USING (true);

-- Coding Suggestions
CREATE POLICY "Auth users can read coding_suggestions" ON public.coding_suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert coding_suggestions" ON public.coding_suggestions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update coding_suggestions" ON public.coding_suggestions FOR UPDATE TO authenticated USING (true);

-- Timely Filing Alerts
CREATE POLICY "Auth users can read timely_filing_alerts" ON public.timely_filing_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert timely_filing_alerts" ON public.timely_filing_alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update timely_filing_alerts" ON public.timely_filing_alerts FOR UPDATE TO authenticated USING (true);

-- Denial Workflows
CREATE POLICY "Auth users can read denial_workflows" ON public.denial_workflows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert denial_workflows" ON public.denial_workflows FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update denial_workflows" ON public.denial_workflows FOR UPDATE TO authenticated USING (true);

-- Claim Attachments
CREATE POLICY "Auth users can read claim_attachments" ON public.claim_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert claim_attachments" ON public.claim_attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update claim_attachments" ON public.claim_attachments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete claim_attachments" ON public.claim_attachments FOR DELETE TO authenticated USING (true);

-- Credit Balances
CREATE POLICY "Auth users can read credit_balances" ON public.credit_balances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert credit_balances" ON public.credit_balances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update credit_balances" ON public.credit_balances FOR UPDATE TO authenticated USING (true);

-- Batch Submissions
CREATE POLICY "Auth users can read batch_submissions" ON public.batch_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert batch_submissions" ON public.batch_submissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update batch_submissions" ON public.batch_submissions FOR UPDATE TO authenticated USING (true);

-- Batch Claim Items
CREATE POLICY "Auth users can read batch_claim_items" ON public.batch_claim_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert batch_claim_items" ON public.batch_claim_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update batch_claim_items" ON public.batch_claim_items FOR UPDATE TO authenticated USING (true);

-- Workload Queues
CREATE POLICY "Auth users can read workload_queues" ON public.workload_queues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage workload_queues" ON public.workload_queues FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Workload Items
CREATE POLICY "Auth users can read workload_items" ON public.workload_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert workload_items" ON public.workload_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update workload_items" ON public.workload_items FOR UPDATE TO authenticated USING (true);

-- Claim Audit Log (immutable - insert only for regular users)
CREATE POLICY "Auth users can read claim_audit_log" ON public.claim_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert claim_audit_log" ON public.claim_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- RTA Transactions
CREATE POLICY "Auth users can read rta_transactions" ON public.rta_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert rta_transactions" ON public.rta_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update rta_transactions" ON public.rta_transactions FOR UPDATE TO authenticated USING (true);

-- Patient Payment Plans
CREATE POLICY "Auth users can read patient_payment_plans" ON public.patient_payment_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert patient_payment_plans" ON public.patient_payment_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update patient_payment_plans" ON public.patient_payment_plans FOR UPDATE TO authenticated USING (true);

-- Patient Payments
CREATE POLICY "Auth users can read patient_payments" ON public.patient_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert patient_payments" ON public.patient_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update patient_payments" ON public.patient_payments FOR UPDATE TO authenticated USING (true);

-- 18. Updated_at triggers for new tables
CREATE TRIGGER update_payer_contracts_updated_at BEFORE UPDATE ON public.payer_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scrub_rules_updated_at BEFORE UPDATE ON public.scrub_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payer_rta_config_updated_at BEFORE UPDATE ON public.payer_rta_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timely_filing_alerts_updated_at BEFORE UPDATE ON public.timely_filing_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_denial_workflows_updated_at BEFORE UPDATE ON public.denial_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_balances_updated_at BEFORE UPDATE ON public.credit_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batch_submissions_updated_at BEFORE UPDATE ON public.batch_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workload_queues_updated_at BEFORE UPDATE ON public.workload_queues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workload_items_updated_at BEFORE UPDATE ON public.workload_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_payment_plans_updated_at BEFORE UPDATE ON public.patient_payment_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 19. Indexes for performance
CREATE INDEX idx_ml_predictions_claim ON public.ml_predictions(claim_id);
CREATE INDEX idx_ml_predictions_risk ON public.ml_predictions(risk_level);
CREATE INDEX idx_scrub_results_claim ON public.scrub_results(claim_id);
CREATE INDEX idx_denial_workflows_claim ON public.denial_workflows(claim_id);
CREATE INDEX idx_denial_workflows_status ON public.denial_workflows(appeal_status);
CREATE INDEX idx_timely_filing_alerts_claim ON public.timely_filing_alerts(claim_id);
CREATE INDEX idx_timely_filing_alerts_level ON public.timely_filing_alerts(alert_level);
CREATE INDEX idx_workload_items_queue ON public.workload_items(queue_id);
CREATE INDEX idx_workload_items_assigned ON public.workload_items(assigned_to);
CREATE INDEX idx_claim_audit_log_claim ON public.claim_audit_log(claim_id);
CREATE INDEX idx_rta_transactions_claim ON public.rta_transactions(claim_id);
CREATE INDEX idx_fee_schedules_contract ON public.fee_schedules(contract_id);
CREATE INDEX idx_fee_schedules_code ON public.fee_schedules(procedure_code);
CREATE INDEX idx_batch_claim_items_batch ON public.batch_claim_items(batch_id);
CREATE INDEX idx_credit_balances_claim ON public.credit_balances(claim_id);
CREATE INDEX idx_claim_attachments_claim ON public.claim_attachments(claim_id);
CREATE INDEX idx_coding_suggestions_claim ON public.coding_suggestions(claim_id);
CREATE INDEX idx_patient_payments_patient ON public.patient_payments(patient_id);
CREATE INDEX idx_claims_ai_risk ON public.claims(ai_risk_level);
CREATE INDEX idx_claims_scrub_status ON public.claims(scrub_status);
CREATE INDEX idx_claims_batch ON public.claims(batch_id);

-- 20. Hash-chain function for audit log
CREATE OR REPLACE FUNCTION public.hash_audit_log_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  prev_hash TEXT;
  hash_input TEXT;
BEGIN
  SELECT record_hash INTO prev_hash FROM public.claim_audit_log
  WHERE claim_id = NEW.claim_id ORDER BY created_at DESC LIMIT 1;

  NEW.previous_hash := COALESCE(prev_hash, 'GENESIS');
  hash_input := NEW.id::text || NEW.claim_id::text || NEW.action || COALESCE(NEW.previous_hash, '') || NEW.created_at::text;
  NEW.record_hash := encode(sha256(hash_input::bytea), 'hex');
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_log_hash_chain
BEFORE INSERT ON public.claim_audit_log
FOR EACH ROW EXECUTE FUNCTION hash_audit_log_entry();

-- 21. Batch number sequence
CREATE SEQUENCE IF NOT EXISTS public.batch_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_batch_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.batch_number IS NULL OR NEW.batch_number = '' THEN
    NEW.batch_number := 'BAT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.batch_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_batch_number
BEFORE INSERT ON public.batch_submissions
FOR EACH ROW EXECUTE FUNCTION generate_batch_number();
