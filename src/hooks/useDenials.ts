import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDenialWorkflows(filters?: { status?: string; category?: string }) {
  return useQuery({
    queryKey: ["denial-workflows", filters],
    queryFn: async () => {
      let query = supabase
        .from("denial_workflows")
        .select(`
          *,
          claims(
            claim_number,
            total_charge_amount,
            service_date,
            payer_id,
            patients(first_name, last_name),
            payers(name)
          )
        `)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("appeal_status", filters.status);
      }
      if (filters?.category && filters.category !== "all") {
        query = query.eq("denial_category", filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateDenialWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("denial_workflows").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["denial-workflows"] });
    },
  });
}

export function useDenialStats() {
  return useQuery({
    queryKey: ["denial-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("denial_workflows")
        .select("denial_category, appeal_status, denial_amount, group_code");
      if (error) throw error;

      const total = data.length;
      const totalAmount = data.reduce((s, d) => s + Number(d.denial_amount), 0);
      const open = data.filter(d => !["closed", "write_off_approved", "appeal_approved"].includes(d.appeal_status)).length;
      const appealed = data.filter(d => ["appeal_drafted", "appeal_submitted"].includes(d.appeal_status)).length;
      const overturned = data.filter(d => d.appeal_status === "appeal_approved").length;
      const writeOffs = data.filter(d => d.appeal_status === "write_off_approved").length;

      const byCat = data.reduce((acc, d) => {
        acc[d.denial_category] = (acc[d.denial_category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byGroup = data.reduce((acc, d) => {
        const g = d.group_code || "unknown";
        acc[g] = (acc[g] || 0) + Number(d.denial_amount);
        return acc;
      }, {} as Record<string, number>);

      return { total, totalAmount, open, appealed, overturned, writeOffs, byCat, byGroup };
    },
  });
}
