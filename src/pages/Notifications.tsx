import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { Bell, Check, CheckCheck, AlertTriangle, Info, AlertCircle, Clock, Filter, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";

const severityConfig: Record<string, { icon: typeof Info; className: string; bg: string }> = {
  info: { icon: Info, className: "text-info", bg: "bg-info/10 border-info/20" },
  warning: { icon: AlertTriangle, className: "text-warning", bg: "bg-warning/10 border-warning/20" },
  critical: { icon: AlertCircle, className: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
  success: { icon: Check, className: "text-success", bg: "bg-success/10 border-success/20" },
};

const categoryLabels: Record<string, string> = {
  claim: "Claims",
  denial: "Denials",
  payment: "Payments",
  compliance: "Compliance",
  ai: "AI Alert",
  system: "System",
  deadline: "Deadline",
};

function NotificationCard({ notification, onRead }: { notification: Notification; onRead: (id: string) => void }) {
  const navigate = useNavigate();
  const config = severityConfig[notification.severity] || severityConfig.info;
  const Icon = config.icon;

  return (
    <Card className={cn("border transition-all", !notification.is_read ? config.bg : "border-border/60 opacity-70")}>
      <CardContent className="flex items-start gap-4 p-4">
        <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", !notification.is_read ? config.bg : "bg-muted")}>
          <Icon className={cn("h-4 w-4", config.className)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {categoryLabels[notification.category] || notification.category}
            </span>
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: `hsl(var(--${notification.severity === "critical" ? "destructive" : notification.severity === "warning" ? "warning" : notification.severity === "success" ? "success" : "info"}))` }}>
              {notification.severity}
            </span>
            {!notification.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
          </div>
          <p className="text-sm font-semibold text-foreground">{notification.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(new Date(notification.created_at), "MMM d, yyyy h:mm a")} ({formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })})
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {notification.action_url && (
            <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate(notification.action_url!)}>
              View
            </Button>
          )}
          {!notification.is_read && (
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => onRead(notification.id)}>
              <Check className="h-3 w-3" /> Read
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Notifications() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  const criticalCount = notifications.filter((n) => n.severity === "critical" && !n.is_read).length;
  const warningCount = notifications.filter((n) => n.severity === "warning" && !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="page-animate-in space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notification Center</h1>
          <p className="text-sm text-muted-foreground">
            Real-time alerts for claims, deadlines, AI findings, and system events.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-1" onClick={markAllAsRead}>
              <CheckCheck className="h-3.5 w-3.5" /> Mark all as read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="mt-1 text-2xl font-bold">{notifications.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Unread</p>
            <p className="mt-1 text-2xl font-bold text-primary">{unreadCount}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Critical</p>
            <p className="mt-1 text-2xl font-bold text-destructive">{criticalCount}</p>
          </CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Warnings</p>
            <p className="mt-1 text-2xl font-bold text-warning">{warningCount}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="critical">Critical</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="ai">AI Alerts</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
        </TabsList>

        {(["all", "unread", "critical", "claims", "ai", "deadlines"] as const).map((tab) => {
          const filtered = notifications.filter((n) => {
            if (tab === "all") return true;
            if (tab === "unread") return !n.is_read;
            if (tab === "critical") return n.severity === "critical";
            if (tab === "claims") return n.category === "claim" || n.category === "denial";
            if (tab === "ai") return n.category === "ai";
            if (tab === "deadlines") return n.category === "deadline";
            return true;
          });

          return (
            <TabsContent key={tab} value={tab} className="space-y-3 pt-4">
              {filtered.length === 0 ? (
                <Card className="border-border/60">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No notifications</p>
                    <p className="text-xs text-muted-foreground/70">
                      {tab === "all" ? "Alerts for claims, denials, AI findings, and deadlines will appear here." : `No ${tab} notifications right now.`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filtered.map((n) => <NotificationCard key={n.id} notification={n} onRead={markAsRead} />)
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
