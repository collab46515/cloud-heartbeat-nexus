import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkloadQueues, useWorkloadItems, useAssignWorkloadItem, useCompleteWorkloadItem } from "@/hooks/useWorkloadQueues";
import { cn } from "@/lib/utils";
import { Inbox, Loader2, CheckCircle, Clock, AlertTriangle, User, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const priorityLabels: Record<number, { label: string; color: string }> = {
  1: { label: "Critical", color: "bg-destructive/15 text-destructive border-destructive/30" },
  2: { label: "High", color: "bg-warning/15 text-warning border-warning/30" },
  3: { label: "Medium", color: "bg-info/15 text-info border-info/30" },
  5: { label: "Normal", color: "bg-muted text-muted-foreground" },
};

const statusColors: Record<string, string> = {
  open: "bg-warning/15 text-warning border-warning/30",
  assigned: "bg-info/15 text-info border-info/30",
  in_progress: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-success/15 text-success border-success/30",
  escalated: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function Workloads() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: queues = [], isLoading: loadingQueues } = useWorkloadQueues();
  const { data: items = [], isLoading: loadingItems } = useWorkloadItems(statusFilter !== "all" ? statusFilter : undefined);
  const assignItem = useAssignWorkloadItem();
  const completeItem = useCompleteWorkloadItem();

  const openItems = items.filter(i => i.status === "open").length;
  const assignedItems = items.filter(i => i.status === "assigned" || i.status === "in_progress").length;
  const completedItems = items.filter(i => i.status === "completed").length;
  const escalatedItems = items.filter(i => i.escalated).length;

  const handleComplete = async (id: string) => {
    try {
      await completeItem.mutateAsync({ id, completion_notes: "Completed from workload queue" });
      toast.success("Item completed");
    } catch { toast.error("Failed to complete"); }
  };

  return (
    <div className="page-animate-in space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Workload Management</h1>
        <p className="text-sm text-muted-foreground">Skill-based routing, priority scoring, and escalation management for your team.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Items</p><p className="mt-1 text-2xl font-bold">{items.length}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Open</p><p className="mt-1 text-2xl font-bold text-warning">{openItems}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">In Progress</p><p className="mt-1 text-2xl font-bold text-primary">{assignedItems}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Completed</p><p className="mt-1 text-2xl font-bold text-success">{completedItems}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Escalated</p><p className="mt-1 text-2xl font-bold text-destructive">{escalatedItems}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList>
          <TabsTrigger value="items" className="gap-1"><Inbox className="h-3 w-3" /> Work Items</TabsTrigger>
          <TabsTrigger value="queues" className="gap-1"><ArrowUpRight className="h-3 w-3" /> Queues</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{items.length} items</span>
          </div>

          {loadingItems ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <Card className="border-border/60"><CardContent className="p-8 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No work items</p>
              <p className="text-xs text-muted-foreground">Items are created automatically when claims need attention.</p>
            </CardContent></Card>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Priority</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Queue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Escalated</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any) => {
                    const prio = priorityLabels[item.priority] || priorityLabels[5];
                    return (
                      <TableRow key={item.id}>
                        <TableCell><Badge variant="outline" className={cn("text-[10px] border", prio.color)}>{prio.label}</Badge></TableCell>
                        <TableCell className="text-sm capitalize">{item.entity_type}</TableCell>
                        <TableCell className="text-sm">{item.workload_queues?.queue_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={cn("text-[10px] border", statusColors[item.status] || "")}>{item.status.replace(/_/g, " ")}</Badge></TableCell>
                        <TableCell className="text-sm">{item.assigned_to ? <span className="flex items-center gap-1"><User className="h-3 w-3" /> Assigned</span> : "Unassigned"}</TableCell>
                        <TableCell className="text-sm">{item.due_date ? new Date(item.due_date).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>{item.escalated ? <AlertTriangle className="h-4 w-4 text-destructive" /> : "—"}</TableCell>
                        <TableCell>
                          {item.status !== "completed" && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleComplete(item.id)}>
                              <CheckCircle className="h-3 w-3" /> Done
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="queues" className="space-y-4 pt-4">
          {loadingQueues ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Queue Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Auto-Assign</TableHead>
                    <TableHead>Max Items/User</TableHead>
                    <TableHead>Escalation (hrs)</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queues.map((q: any) => (
                    <TableRow key={q.id}>
                      <TableCell><div><p className="font-medium text-sm">{q.queue_name}</p><p className="text-xs text-muted-foreground">{q.description}</p></div></TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{q.queue_type.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-sm">{q.priority}</TableCell>
                      <TableCell>{q.auto_assign ? <CheckCircle className="h-4 w-4 text-success" /> : "—"}</TableCell>
                      <TableCell className="text-sm">{q.max_items_per_user}</TableCell>
                      <TableCell className="text-sm">{q.escalation_hours}h</TableCell>
                      <TableCell>{q.is_active ? <CheckCircle className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4 text-muted-foreground" />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
