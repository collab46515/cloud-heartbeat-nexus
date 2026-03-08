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

export function useWorkloadItems(statusFilter?: string) {
  return useQuery({
    queryKey: ["workload-items", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("workload_items")
        .select(`
          *,
          workload_queues(queue_name, queue_type),
          claims(claim_number, total_charge_amount, claim_status, patients(first_name, last_name))
        `)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: true });

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
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

export function useAssignWorkloadItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assigned_to }: { id: string; assigned_to: string }) => {
      const { error } = await supabase.from("workload_items").update({ assigned_to, assigned_at: new Date().toISOString(), status: "assigned" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workload-items"] });
    },
  });
}

export function useCompleteWorkloadItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completion_notes }: { id: string; completion_notes?: string }) => {
      const { error } = await supabase.from("workload_items").update({ status: "completed", completed_at: new Date().toISOString(), completion_notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workload-items"] });
    },
  });
}
