import { Claim, Payer } from "@/types/rcm";

export const mockPayers: Payer[] = [
  { payer_id: "p1", name: "UnitedHealthcare", payer_type: "commercial", edi_payer_id: "87726", clearinghouse: "Change Healthcare", avg_days_to_pay: 28, denial_rate: 0.06 },
  { payer_id: "p2", name: "Anthem BCBS", payer_type: "commercial", edi_payer_id: "00601", clearinghouse: "Availity", avg_days_to_pay: 32, denial_rate: 0.08 },
  { payer_id: "p3", name: "Medicare Part A", payer_type: "medicare", edi_payer_id: "00401", clearinghouse: "Change Healthcare", avg_days_to_pay: 14, denial_rate: 0.04 },
  { payer_id: "p4", name: "Aetna", payer_type: "commercial", edi_payer_id: "60054", clearinghouse: "Availity", avg_days_to_pay: 35, denial_rate: 0.09 },
  { payer_id: "p5", name: "Cigna", payer_type: "commercial", edi_payer_id: "62308", clearinghouse: "Waystar", avg_days_to_pay: 30, denial_rate: 0.07 },
  { payer_id: "p6", name: "Medicaid - CA", payer_type: "medicaid", edi_payer_id: "CA001", clearinghouse: "Change Healthcare", avg_days_to_pay: 45, denial_rate: 0.12 },
];

export const mockClaims: Claim[] = [
  {
    claim_id: "c001", tenant_id: "t1", encounter_id: "e001", patient_id: "pt001",
    patient_name: "James Morrison", payer_id: "p1", payer_name: "UnitedHealthcare",
    claim_number: "CLM-2024-00142", claim_type: "professional",
    total_charge_amount: 4850.00, total_paid_amount: 3880.00, patient_responsibility: 970.00,
    claim_status: "paid", submission_date: "2024-12-15", service_date: "2024-12-10",
    provider_name: "Dr. Sarah Chen", facility_name: "Metro General Hospital",
    diagnoses: [{ code: "M54.5", description: "Low back pain", present_on_admission: true, rank: "primary" }],
    line_items: [
      { line_item_id: "li001", service_date: "2024-12-10", procedure_code: "99214", procedure_description: "Office visit, est patient, moderate", modifiers: [], units: 1, charge_amount: 250.00, diagnosis_pointer: "1" },
      { line_item_id: "li002", service_date: "2024-12-10", procedure_code: "72148", procedure_description: "MRI lumbar spine w/o contrast", modifiers: [], units: 1, charge_amount: 4600.00, diagnosis_pointer: "1" },
    ],
    days_in_ar: 0, created_at: "2024-12-10T08:00:00Z", updated_at: "2025-01-12T14:30:00Z",
  },
  {
    claim_id: "c002", tenant_id: "t1", encounter_id: "e002", patient_id: "pt002",
    patient_name: "Maria Garcia", payer_id: "p3", payer_name: "Medicare Part A",
    claim_number: "CLM-2024-00198", claim_type: "institutional",
    total_charge_amount: 28750.00, total_paid_amount: 0, patient_responsibility: 0,
    claim_status: "submitted", submission_date: "2025-03-02", service_date: "2025-02-28",
    provider_name: "Dr. Robert Kim", facility_name: "Metro General Hospital",
    diagnoses: [
      { code: "I21.0", description: "ST elevation MI, anterior wall", present_on_admission: true, rank: "primary" },
      { code: "I10", description: "Essential hypertension", present_on_admission: true, rank: "secondary" },
    ],
    line_items: [
      { line_item_id: "li003", service_date: "2025-02-28", procedure_code: "92928", procedure_description: "Percutaneous coronary stent", modifiers: [], units: 1, charge_amount: 22000.00, diagnosis_pointer: "1" },
      { line_item_id: "li004", service_date: "2025-02-28", procedure_code: "99223", procedure_description: "Initial hospital care, high", modifiers: [], units: 1, charge_amount: 6750.00, diagnosis_pointer: "1,2" },
    ],
    days_in_ar: 6, created_at: "2025-02-28T10:15:00Z", updated_at: "2025-03-02T09:00:00Z",
  },
  {
    claim_id: "c003", tenant_id: "t1", encounter_id: "e003", patient_id: "pt003",
    patient_name: "Robert Johnson", payer_id: "p2", payer_name: "Anthem BCBS",
    claim_number: "CLM-2025-00015", claim_type: "professional",
    total_charge_amount: 1200.00, total_paid_amount: 0, patient_responsibility: 0,
    claim_status: "denied", submission_date: "2025-01-20", service_date: "2025-01-15",
    provider_name: "Dr. Lisa Patel", facility_name: "Downtown Surgical Center",
    diagnoses: [{ code: "M17.11", description: "Primary osteoarthritis, right knee", present_on_admission: true, rank: "primary" }],
    line_items: [
      { line_item_id: "li005", service_date: "2025-01-15", procedure_code: "20611", procedure_description: "Arthrocentesis, major joint", modifiers: ["RT"], units: 1, charge_amount: 1200.00, diagnosis_pointer: "1" },
    ],
    denial_reason_code: "CO-4", denial_reason_description: "The procedure code is inconsistent with the modifier used",
    days_in_ar: 47, created_at: "2025-01-15T14:00:00Z", updated_at: "2025-02-06T11:00:00Z",
  },
  {
    claim_id: "c004", tenant_id: "t1", encounter_id: "e004", patient_id: "pt004",
    patient_name: "Angela Williams", payer_id: "p4", payer_name: "Aetna",
    claim_number: "CLM-2025-00032", claim_type: "professional",
    total_charge_amount: 3200.00, total_paid_amount: 0, patient_responsibility: 0,
    claim_status: "pending", submission_date: "2025-02-10", service_date: "2025-02-05",
    provider_name: "Dr. Sarah Chen", facility_name: "Metro General Hospital",
    diagnoses: [{ code: "E11.9", description: "Type 2 diabetes mellitus w/o complications", present_on_admission: true, rank: "primary" }],
    line_items: [
      { line_item_id: "li006", service_date: "2025-02-05", procedure_code: "99215", procedure_description: "Office visit, est patient, high", modifiers: [], units: 1, charge_amount: 350.00, diagnosis_pointer: "1" },
      { line_item_id: "li007", service_date: "2025-02-05", procedure_code: "83036", procedure_description: "Hemoglobin A1c", modifiers: [], units: 1, charge_amount: 50.00, diagnosis_pointer: "1" },
      { line_item_id: "li008", service_date: "2025-02-05", procedure_code: "80053", procedure_description: "Comprehensive metabolic panel", modifiers: [], units: 1, charge_amount: 2800.00, diagnosis_pointer: "1" },
    ],
    days_in_ar: 26, created_at: "2025-02-05T09:30:00Z", updated_at: "2025-02-10T16:00:00Z",
  },
  {
    claim_id: "c005", tenant_id: "t1", encounter_id: "e005", patient_id: "pt005",
    patient_name: "David Chen", payer_id: "p5", payer_name: "Cigna",
    claim_number: "CLM-2025-00041", claim_type: "professional",
    total_charge_amount: 750.00, total_paid_amount: 600.00, patient_responsibility: 150.00,
    claim_status: "partial_paid", submission_date: "2025-01-25", service_date: "2025-01-22",
    provider_name: "Dr. Lisa Patel", facility_name: "Downtown Surgical Center",
    diagnoses: [{ code: "J06.9", description: "Acute upper respiratory infection", present_on_admission: true, rank: "primary" }],
    line_items: [
      { line_item_id: "li009", service_date: "2025-01-22", procedure_code: "99213", procedure_description: "Office visit, est patient, low", modifiers: [], units: 1, charge_amount: 175.00, diagnosis_pointer: "1" },
      { line_item_id: "li010", service_date: "2025-01-22", procedure_code: "87880", procedure_description: "Strep test, rapid", modifiers: [], units: 1, charge_amount: 575.00, diagnosis_pointer: "1" },
    ],
    days_in_ar: 12, created_at: "2025-01-22T11:00:00Z", updated_at: "2025-02-03T10:00:00Z",
  },
  {
    claim_id: "c006", tenant_id: "t1", encounter_id: "e006", patient_id: "pt006",
    patient_name: "Patricia Brown", payer_id: "p6", payer_name: "Medicaid - CA",
    claim_number: "CLM-2025-00055", claim_type: "institutional",
    total_charge_amount: 15400.00, total_paid_amount: 0, patient_responsibility: 0,
    claim_status: "scrubbing", service_date: "2025-03-05",
    provider_name: "Dr. Robert Kim", facility_name: "Metro General Hospital",
    diagnoses: [
      { code: "O80", description: "Encounter for full-term uncomplicated delivery", present_on_admission: true, rank: "primary" },
    ],
    line_items: [
      { line_item_id: "li011", service_date: "2025-03-05", procedure_code: "59400", procedure_description: "Routine OB care, vaginal delivery", modifiers: [], units: 1, charge_amount: 15400.00, diagnosis_pointer: "1" },
    ],
    days_in_ar: 0, created_at: "2025-03-05T06:00:00Z", updated_at: "2025-03-05T06:00:00Z",
  },
  {
    claim_id: "c007", tenant_id: "t1", encounter_id: "e007", patient_id: "pt007",
    patient_name: "Thomas Wilson", payer_id: "p1", payer_name: "UnitedHealthcare",
    claim_number: "CLM-2025-00063", claim_type: "professional",
    total_charge_amount: 2100.00, total_paid_amount: 0, patient_responsibility: 0,
    claim_status: "appealed", submission_date: "2025-01-05", service_date: "2025-01-02",
    provider_name: "Dr. Sarah Chen", facility_name: "Metro General Hospital",
    diagnoses: [{ code: "G43.909", description: "Migraine, unspecified", present_on_admission: true, rank: "primary" }],
    line_items: [
      { line_item_id: "li012", service_date: "2025-01-02", procedure_code: "99285", procedure_description: "ED visit, high severity", modifiers: [], units: 1, charge_amount: 2100.00, diagnosis_pointer: "1" },
    ],
    denial_reason_code: "CO-197", denial_reason_description: "Precertification/authorization/notification absent",
    days_in_ar: 65, created_at: "2025-01-02T22:00:00Z", updated_at: "2025-03-01T09:00:00Z",
  },
  {
    claim_id: "c008", tenant_id: "t1", encounter_id: "e008", patient_id: "pt008",
    patient_name: "Susan Martinez", payer_id: "p2", payer_name: "Anthem BCBS",
    claim_number: "CLM-2025-00078", claim_type: "professional",
    total_charge_amount: 890.00, total_paid_amount: 0, patient_responsibility: 0,
    claim_status: "acknowledged", submission_date: "2025-03-01", service_date: "2025-02-26",
    provider_name: "Dr. Lisa Patel", facility_name: "Downtown Surgical Center",
    diagnoses: [{ code: "H10.10", description: "Acute atopic conjunctivitis, unspecified eye", present_on_admission: true, rank: "primary" }],
    line_items: [
      { line_item_id: "li013", service_date: "2025-02-26", procedure_code: "99212", procedure_description: "Office visit, est patient, straightforward", modifiers: [], units: 1, charge_amount: 890.00, diagnosis_pointer: "1" },
    ],
    days_in_ar: 7, created_at: "2025-02-26T15:00:00Z", updated_at: "2025-03-01T12:00:00Z",
  },
  {
    claim_id: "c009", tenant_id: "t1", encounter_id: "e009", patient_id: "pt009",
    patient_name: "Michael Davis", payer_id: "p3", payer_name: "Medicare Part A",
    claim_number: "CLM-2025-00089", claim_type: "institutional",
    total_charge_amount: 42000.00, total_paid_amount: 38500.00, patient_responsibility: 3500.00,
    claim_status: "paid", submission_date: "2025-01-10", service_date: "2025-01-05",
    provider_name: "Dr. Robert Kim", facility_name: "Metro General Hospital",
    diagnoses: [
      { code: "S72.001A", description: "Fracture of unspecified part of neck of right femur", present_on_admission: true, rank: "primary" },
    ],
    line_items: [
      { line_item_id: "li014", service_date: "2025-01-05", procedure_code: "27236", procedure_description: "Open treatment femoral fracture", modifiers: [], units: 1, charge_amount: 42000.00, diagnosis_pointer: "1" },
    ],
    days_in_ar: 0, created_at: "2025-01-05T07:00:00Z", updated_at: "2025-01-24T11:00:00Z",
  },
  {
    claim_id: "c010", tenant_id: "t1", encounter_id: "e010", patient_id: "pt010",
    patient_name: "Jennifer Lee", payer_id: "p4", payer_name: "Aetna",
    claim_number: "CLM-2025-00102", claim_type: "professional",
    total_charge_amount: 1650.00, total_paid_amount: 0, patient_responsibility: 0,
    claim_status: "draft", service_date: "2025-03-07",
    provider_name: "Dr. Sarah Chen", facility_name: "Metro General Hospital",
    diagnoses: [{ code: "F41.1", description: "Generalized anxiety disorder", present_on_admission: true, rank: "primary" }],
    line_items: [
      { line_item_id: "li015", service_date: "2025-03-07", procedure_code: "90837", procedure_description: "Psychotherapy, 60 minutes", modifiers: [], units: 1, charge_amount: 1650.00, diagnosis_pointer: "1" },
    ],
    days_in_ar: 0, created_at: "2025-03-07T13:00:00Z", updated_at: "2025-03-07T13:00:00Z",
  },
];

export function getClaimStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scrubbing: "bg-info/15 text-info border-info/30",
    submitted: "bg-primary/15 text-primary border-primary/30",
    acknowledged: "bg-info/15 text-info border-info/30",
    pending: "bg-warning/15 text-warning border-warning/30",
    paid: "bg-success/15 text-success border-success/30",
    partial_paid: "bg-success/15 text-success border-success/30",
    denied: "bg-destructive/15 text-destructive border-destructive/30",
    appealed: "bg-[hsl(280,60%,50%)]/15 text-[hsl(280,60%,50%)] border-[hsl(280,60%,50%)]/30",
    void: "bg-muted text-muted-foreground",
  };
  return map[status] || "bg-muted text-muted-foreground";
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function formatClaimStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}
