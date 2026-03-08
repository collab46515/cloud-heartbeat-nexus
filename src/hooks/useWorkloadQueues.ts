import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWorkloadQueues() {
  return useQuery({
    queryKey: ["workload-queues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workload_queues")
        .select("*")
        .order("priority", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useWorkloadItems(queueId?: string) {
  return useQuery({
    queryKey: ["workload-items", queueId],
    queryFn: async () => {
      let query = supabase
        .from("workload_items")
        .select(`
          *,
          claims(claim_number, total_charge_amount, claim_status, patients(first_name, last_name))
        `)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });

      if (queueId) {
        query = query.eq("queue_id", queueId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!queueId,
  });
}

export function useUpdateWorkloadItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("workload_items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workload-items"] });
    },
  });
}
