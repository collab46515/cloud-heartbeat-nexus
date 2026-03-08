
-- ============================================
-- RCM360 Phase 1: Core Database Schema
-- ============================================

-- Enums
CREATE TYPE public.claim_status AS ENUM (
  'draft', 'scrubbing', 'submitted', 'acknowledged', 'pending', 
  'paid', 'partial_paid', 'denied', 'appealed', 'void'
);

CREATE TYPE public.claim_type AS ENUM ('professional', 'institutional');
CREATE TYPE public.visit_type AS ENUM ('inpatient', 'outpatient', 'ed', 'observation');
CREATE TYPE public.app_role AS ENUM ('admin', 'biller', 'coder', 'front_desk', 'manager');

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- Profiles (linked to auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- User Roles
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Patients
-- ============================================
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob DATE NOT NULL,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address JSONB DEFAULT '{}',
  insurance JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mrn)
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read patients" ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update patients" ON public.patients FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Providers
-- ============================================
CREATE TABLE public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npi TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  specialty TEXT,
  taxonomy_code TEXT,
  facility_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(npi)
);

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read providers" ON public.providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert providers" ON public.providers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update providers" ON public.providers FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON public.providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Payers
-- ============================================
CREATE TABLE public.payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  payer_type TEXT NOT NULL DEFAULT 'commercial',
  edi_payer_id TEXT,
  clearinghouse TEXT,
  avg_days_to_pay INTEGER DEFAULT 30,
  denial_rate NUMERIC(5,4) DEFAULT 0.05,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read payers" ON public.payers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert payers" ON public.payers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update payers" ON public.payers FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_payers_updated_at BEFORE UPDATE ON public.payers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Encounters
-- ============================================
CREATE TABLE public.encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  visit_type visit_type NOT NULL DEFAULT 'outpatient',
  admission_date DATE NOT NULL,
  discharge_date DATE,
  attending_provider_id UUID REFERENCES public.providers(id),
  facility_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  total_charges NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read encounters" ON public.encounters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert encounters" ON public.encounters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update encounters" ON public.encounters FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_encounters_updated_at BEFORE UPDATE ON public.encounters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Claims
-- ============================================
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES public.encounters(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  payer_id UUID NOT NULL REFERENCES public.payers(id),
  provider_id UUID REFERENCES public.providers(id),
  claim_number TEXT NOT NULL,
  external_claim_id TEXT,
  claim_type claim_type NOT NULL DEFAULT 'professional',
  total_charge_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  patient_responsibility NUMERIC(12,2) NOT NULL DEFAULT 0,
  claim_status claim_status NOT NULL DEFAULT 'draft',
  submission_date DATE,
  service_date DATE NOT NULL,
  facility_name TEXT,
  diagnoses JSONB DEFAULT '[]',
  denial_reason_code TEXT,
  denial_reason_description TEXT,
  days_in_ar INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(claim_number)
);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read claims" ON public.claims FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert claims" ON public.claims FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update claims" ON public.claims FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON public.claims
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_claims_status ON public.claims(claim_status);
CREATE INDEX idx_claims_patient ON public.claims(patient_id);
CREATE INDEX idx_claims_payer ON public.claims(payer_id);
CREATE INDEX idx_claims_service_date ON public.claims(service_date);
CREATE INDEX idx_claims_submission_date ON public.claims(submission_date);

-- ============================================
-- Claim Line Items
-- ============================================
CREATE TABLE public.claim_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  procedure_code TEXT NOT NULL,
  procedure_description TEXT,
  modifiers TEXT[] DEFAULT '{}',
  units INTEGER NOT NULL DEFAULT 1,
  charge_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  diagnosis_pointer TEXT,
  revenue_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.claim_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read line items" ON public.claim_line_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert line items" ON public.claim_line_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update line items" ON public.claim_line_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete line items" ON public.claim_line_items FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_line_items_claim ON public.claim_line_items(claim_id);

-- ============================================
-- Audit Log (HIPAA compliance)
-- ============================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read audit logs" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at);

-- ============================================
-- Claim number sequence
-- ============================================
CREATE SEQUENCE public.claim_number_seq START 1000;

CREATE OR REPLACE FUNCTION public.generate_claim_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.claim_number IS NULL OR NEW.claim_number = '' THEN
    NEW.claim_number := 'CLM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.claim_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_claim_number_trigger
BEFORE INSERT ON public.claims
FOR EACH ROW EXECUTE FUNCTION public.generate_claim_number();
