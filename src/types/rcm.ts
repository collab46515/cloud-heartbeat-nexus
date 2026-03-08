// ===== Core RCM Data Models =====

export type ClaimStatus = 
  | "draft" 
  | "scrubbing" 
  | "submitted" 
  | "acknowledged" 
  | "pending" 
  | "paid" 
  | "partial_paid" 
  | "denied" 
  | "appealed" 
  | "void";

export type ClaimType = "professional" | "institutional";
export type VisitType = "inpatient" | "outpatient" | "ed" | "observation";
export type CoverageType = "primary" | "secondary" | "tertiary";
export type EligibilityStatus = "active" | "inactive" | "pending";

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface Patient {
  patient_id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  dob: string;
  gender: string;
  address: Address;
  phone: string;
  email: string;
  insurance: Insurance[];
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

export interface Insurance {
  payer_id: string;
  payer_name: string;
  policy_number: string;
  group_number: string;
  subscriber_relationship: string;
  coverage_type: CoverageType;
  eligibility_verified_at?: string;
  eligibility_status: EligibilityStatus;
}

export interface Provider {
  provider_id: string;
  npi: string;
  first_name: string;
  last_name: string;
  specialty: string;
  taxonomy_code: string;
  facility_id: string;
  tenant_id: string;
}

export interface Payer {
  payer_id: string;
  name: string;
  payer_type: "commercial" | "medicare" | "medicaid" | "tricare" | "other";
  edi_payer_id: string;
  clearinghouse: string;
  avg_days_to_pay: number;
  denial_rate: number;
}

export interface Diagnosis {
  code: string;
  description: string;
  present_on_admission: boolean;
  rank: "primary" | "secondary";
}

export interface Procedure {
  code: string;
  description: string;
  modifiers: string[];
  units: number;
  service_date: string;
  rendering_provider_id: string;
}

export interface ClaimLineItem {
  line_item_id: string;
  service_date: string;
  procedure_code: string;
  procedure_description: string;
  modifiers: string[];
  units: number;
  charge_amount: number;
  diagnosis_pointer: string;
  revenue_code?: string;
}

export interface Claim {
  claim_id: string;
  tenant_id: string;
  encounter_id: string;
  patient_id: string;
  patient_name: string;
  payer_id: string;
  payer_name: string;
  claim_number: string;
  external_claim_id?: string;
  claim_type: ClaimType;
  total_charge_amount: number;
  total_paid_amount: number;
  patient_responsibility: number;
  claim_status: ClaimStatus;
  submission_date?: string;
  service_date: string;
  provider_name: string;
  facility_name: string;
  diagnoses: Diagnosis[];
  line_items: ClaimLineItem[];
  denial_reason_code?: string;
  denial_reason_description?: string;
  days_in_ar: number;
  created_at: string;
  updated_at: string;
}

export interface Encounter {
  encounter_id: string;
  tenant_id: string;
  patient_id: string;
  visit_type: VisitType;
  admission_date: string;
  discharge_date?: string;
  attending_provider_id: string;
  facility_id: string;
  status: "active" | "discharged" | "canceled";
  total_charges: number;
  created_at: string;
}

// KPI types
export interface KpiMetric {
  label: string;
  value: string | number;
  change?: number; // percentage change
  trend?: "up" | "down" | "flat";
  target?: string | number;
}
