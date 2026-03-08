import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type ClaimRow = Tables<"claims">;
type ClaimLineItemRow = Tables<"claim_line_items">;

export interface ClaimWithRelations extends ClaimRow {
  patients: { first_name: string; last_name: string; mrn: string } | null;
  payers: { name: string; payer_type: string } | null;
  providers: { first_name: string; last_name: string; npi: string } | null;
  claim_line_items: ClaimLineItemRow[];
}

export function useClaims(filters?: {
  status?: string;
  payer_id?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["claims", filters],
    queryFn: async () => {
      let query = supabase
        .from("claims")
        .select(`
          *,
          patients(first_name, last_name, mrn),
          payers(name, payer_type),
          providers(first_name, last_name, npi),
          claim_line_items(*)
        `)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("claim_status", filters.status as any);
      }
      if (filters?.payer_id && filters.payer_id !== "all") {
        query = query.eq("payer_id", filters.payer_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = data as unknown as ClaimWithRelations[];

      if (filters?.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(
          (c) =>
            c.claim_number.toLowerCase().includes(s) ||
            `${c.patients?.first_name} ${c.patients?.last_name}`.toLowerCase().includes(s) ||
            c.payers?.name?.toLowerCase().includes(s)
        );
      }

      return results;
    },
  });
}

export function useClaimStats() {
  return useQuery({
    queryKey: ["claim-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("claim_status, total_charge_amount, total_paid_amount, days_in_ar");
      if (error) throw error;

      const total = data.length;
      const denied = data.filter((c) => c.claim_status === "denied").length;
      const paid = data.filter((c) => c.claim_status === "paid" || c.claim_status === "partial_paid");
      const totalCharged = data.reduce((s, c) => s + Number(c.total_charge_amount), 0);
      const totalPaid = paid.reduce((s, c) => s + Number(c.total_paid_amount), 0);
      const avgDaysAR = data.filter((c) => c.days_in_ar > 0).reduce((s, c, _, a) => s + c.days_in_ar / a.length, 0);
      const pendingAmount = data
        .filter((c) => !["paid", "void"].includes(c.claim_status))
        .reduce((s, c) => s + Number(c.total_charge_amount) - Number(c.total_paid_amount), 0);
      const pendingCount = data.filter((c) => !["paid", "void"].includes(c.claim_status)).length;
      const cleanRate = total > 0 ? ((total - denied) / total) * 100 : 0;
      const collectionRate = totalCharged > 0 ? (totalPaid / totalCharged) * 100 : 0;
      const denialRate = total > 0 ? (denied / total) * 100 : 0;

      return {
        total,
        denied,
        cleanRate: cleanRate.toFixed(1),
        avgDaysAR: avgDaysAR.toFixed(1),
        collectionRate: collectionRate.toFixed(1),
        denialRate: denialRate.toFixed(1),
        pendingAmount,
        pendingCount,
        appealed: data.filter((c) => c.claim_status === "appealed").length,
        highAR: data.filter((c) => c.days_in_ar > 30).length,
        statusCounts: data.reduce((acc, c) => {
          acc[c.claim_status] = (acc[c.claim_status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
    },
  });
}

export function usePayers() {
  return useQuery({
    queryKey: ["payers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payers").select("*").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (claim: TablesInsert<"claims"> & { line_items?: TablesInsert<"claim_line_items">[] }) => {
      const { line_items, ...claimData } = claim;
      const { data, error } = await supabase.from("claims").insert(claimData).select().single();
      if (error) throw error;

      if (line_items?.length) {
        const items = line_items.map((li) => ({ ...li, claim_id: data.id }));
        const { error: liError } = await supabase.from("claim_line_items").insert(items);
        if (liError) throw liError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      queryClient.invalidateQueries({ queryKey: ["claim-stats"] });
    },
  });
}
