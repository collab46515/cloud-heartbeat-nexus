import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useScrubRules(includeInactive = true) {
  return useQuery({
    queryKey: ["scrub-rules", includeInactive],
    queryFn: async () => {
      let query = supabase.from("scrub_rules").select("*").order("severity", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useScrubResults(claimId?: string) {
  return useQuery({
    queryKey: ["scrub-results", claimId],
    queryFn: async () => {
      let query = supabase
        .from("scrub_results")
        .select("*, scrub_rules(rule_name, category, severity)")
        .order("created_at", { ascending: false });

      if (claimId) {
        query = query.eq("claim_id", claimId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useResolveScrubResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resolution_notes }: { id: string; resolution_notes: string }) => {
      const { error } = await supabase
        .from("scrub_results")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrub-results"] });
      queryClient.invalidateQueries({ queryKey: ["scrub-stats"] });
    },
  });
}

export function useScrubStats() {
  return useQuery({
    queryKey: ["scrub-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("scrub_results").select("severity, resolved, auto_corrected, claim_id");
      if (error) throw error;

      const total = data.length;
      const errors = data.filter((r) => r.severity === "error").length;
      const warnings = data.filter((r) => r.severity === "warning").length;
      const resolved = data.filter((r) => r.resolved).length;
      const autoCorrected = data.filter((r) => r.auto_corrected).length;
      const uniqueClaims = new Set(data.map((r) => r.claim_id)).size;

      return { total, errors, warnings, resolved, autoCorrected, uniqueClaims };
    },
  });
}

export function useRunScrub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (claimId: string) => {
      const { data, error } = await supabase.functions.invoke("scrub-claim", {
        body: { claim_id: claimId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrub-results"] });
      queryClient.invalidateQueries({ queryKey: ["scrub-stats"] });
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      queryClient.invalidateQueries({ queryKey: ["claims-for-scrub"] });
    },
  });
}

export function useRunBulkScrub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (claimIds: string[]) => {
      const results = [];
      for (const id of claimIds) {
        try {
          const { data, error } = await supabase.functions.invoke("scrub-claim", {
            body: { claim_id: id },
          });
          results.push({ claim_id: id, success: !error && !data?.error, data, error });
        } catch (e) {
          results.push({ claim_id: id, success: false, error: e });
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrub-results"] });
      queryClient.invalidateQueries({ queryKey: ["scrub-stats"] });
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      queryClient.invalidateQueries({ queryKey: ["claims-for-scrub"] });
    },
  });
}

export function useSaveScrubRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (payload.id) {
        const { id, ...updates } = payload;
        const { error } = await supabase
          .from("scrub_rules")
          .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from("scrub_rules")
        .insert({ ...payload, created_by: userId, updated_by: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrub-rules"] });
    },
  });
}

export function useDeleteScrubRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scrub_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrub-rules"] });
    },
  });
}
