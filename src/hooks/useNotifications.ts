import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  category: string;
  severity: string;
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) setNotifications(data as unknown as Notification[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((prev) => [payload.new as unknown as Notification, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === (payload.new as any).id ? (payload.new as unknown as Notification) : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useCallback(async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() } as any)
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() } as any)
      .in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
  }, [notifications]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
