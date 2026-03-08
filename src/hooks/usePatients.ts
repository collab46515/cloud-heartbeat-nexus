import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type PatientRow = Tables<"patients">;

export function usePatients(search?: string) {
  return useQuery({
    queryKey: ["patients", search],
    queryFn: async () => {
      let query = supabase
        .from("patients")
        .select("*")
        .eq("is_active", true)
        .order("last_name", { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      if (search) {
        const s = search.toLowerCase();
        return data.filter(
          (p) =>
            p.first_name.toLowerCase().includes(s) ||
            p.last_name.toLowerCase().includes(s) ||
            p.mrn.toLowerCase().includes(s) ||
            p.email?.toLowerCase().includes(s)
        );
      }
      return data;
    },
  });
}

export function usePatient(id?: string) {
  return useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function usePatientClaims(patientId?: string) {
  return useQuery({
    queryKey: ["patient-claims", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("*, payers(name), claim_line_items(*)")
        .eq("patient_id", patientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!patientId,
  });
}

export function usePatientPayments(patientId?: string) {
  return useQuery({
    queryKey: ["patient-payments", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_payments")
        .select("*")
        .eq("patient_id", patientId!)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!patientId,
  });
}

export function usePatientPaymentPlans(patientId?: string) {
  return useQuery({
    queryKey: ["patient-payment-plans", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_payment_plans")
        .select("*")
        .eq("patient_id", patientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payment: TablesInsert<"patient_payments">) => {
      const { data, error } = await supabase
        .from("patient_payments")
        .insert(payment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-payments"] });
      queryClient.invalidateQueries({ queryKey: ["patient-claims"] });
    },
  });
}

export function useCreatePaymentPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plan: TablesInsert<"patient_payment_plans">) => {
      const { data, error } = await supabase
        .from("patient_payment_plans")
        .insert(plan)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-payment-plans"] });
    },
  });
}
