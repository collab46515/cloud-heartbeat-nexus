import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBatchSubmissions() {
  return useQuery({
    queryKey: ["batch-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batch_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batch: { batch_type: string; payer_id?: string; clearinghouse?: string; claim_ids: string[] }) => {
      const { claim_ids, ...batchData } = batch;
      const { data, error } = await supabase
        .from("batch_submissions")
        .insert({
          ...batchData,
          batch_number: "",
          claim_count: claim_ids.length,
        })
        .select()
        .single();
      if (error) throw error;

      if (claim_ids.length > 0) {
        const items = claim_ids.map((cid, i) => ({
          batch_id: data.id,
          claim_id: cid,
          line_number: i + 1,
        }));
        const { error: itemsError } = await supabase.from("batch_claim_items").insert(items);
        if (itemsError) throw itemsError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-submissions"] });
    },
  });
}
