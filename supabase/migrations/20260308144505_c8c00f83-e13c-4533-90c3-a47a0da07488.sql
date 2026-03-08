
-- Session events for Behavioral Biometrics (UBA)
CREATE TABLE public.session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  ip_address text,
  user_agent text,
  geo_location jsonb DEFAULT '{}',
  risk_score numeric DEFAULT 0,
  is_anomalous boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read session_events" ON public.session_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert session_events" ON public.session_events FOR INSERT TO authenticated WITH CHECK (true);

-- Compliance checks for Global Compliance Engine
CREATE TABLE public.compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL,
  check_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  severity text DEFAULT 'medium',
  entity_type text,
  entity_id uuid,
  details jsonb DEFAULT '{}',
  remediation text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);
ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read compliance_checks" ON public.compliance_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert compliance_checks" ON public.compliance_checks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update compliance_checks" ON public.compliance_checks FOR UPDATE TO authenticated USING (true);

-- STP pipeline runs for Touchless Processing
CREATE TABLE public.stp_pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid REFERENCES public.claims(id),
  pipeline_stage text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  is_touchless boolean DEFAULT true,
  failure_reason text,
  processing_time_ms integer,
  auto_actions_taken jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.stp_pipeline_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read stp_pipeline_runs" ON public.stp_pipeline_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert stp_pipeline_runs" ON public.stp_pipeline_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update stp_pipeline_runs" ON public.stp_pipeline_runs FOR UPDATE TO authenticated USING (true);

-- Automation rules for Self-Healing
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_type text NOT NULL,
  trigger_condition jsonb NOT NULL DEFAULT '{}',
  action_config jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  success_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  last_executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read automation_rules" ON public.automation_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage automation_rules" ON public.automation_rules FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Automation executions log
CREATE TABLE public.automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.automation_rules(id),
  claim_id uuid REFERENCES public.claims(id),
  status text NOT NULL DEFAULT 'pending',
  input_data jsonb DEFAULT '{}',
  output_data jsonb DEFAULT '{}',
  error_message text,
  execution_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read automation_executions" ON public.automation_executions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert automation_executions" ON public.automation_executions FOR INSERT TO authenticated WITH CHECK (true);

-- Integration configurations
CREATE TABLE public.integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name text NOT NULL,
  integration_type text NOT NULL,
  vendor text,
  status text NOT NULL DEFAULT 'inactive',
  connection_method text,
  endpoint_url text,
  last_sync_at timestamptz,
  last_error text,
  sync_frequency text DEFAULT 'realtime',
  records_synced integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read integration_configs" ON public.integration_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage integration_configs" ON public.integration_configs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Data residency configurations
CREATE TABLE public.data_residency_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_name text NOT NULL,
  region_code text NOT NULL,
  country_code text NOT NULL,
  regulation text,
  data_types text[] DEFAULT '{}',
  encryption_standard text DEFAULT 'AES-256',
  is_primary boolean DEFAULT false,
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.data_residency_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read data_residency_configs" ON public.data_residency_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage data_residency_configs" ON public.data_residency_configs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
