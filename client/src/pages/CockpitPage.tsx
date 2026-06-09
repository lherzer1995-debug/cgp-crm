import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Bell, CheckCircle2, Clock, AlertTriangle, Plus, Trash2, Check,
  CalendarClock, ArrowRight, BarChart3, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Reminder } from "@shared/schema";
import ReminderDialog from "@/components/ReminderDialog";

type EnrichedReminder = Reminder & { customerName: string };

const STATUS_LABELS: Record<string, string> = {
  pending: "Offen",
  done: "Erledigt",
  snoozed: "Verschoben",
};

function daysLabel(dueDate: string): { label: string; color: string } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `Überfällig (${Math.abs(diff)}d)`, color: "text-destructive" };
  if (diff === 0) return { label: "Heute", color: "text-amber-600 dark:text-amber-400" };
  if (diff === 1) return { label: "Morgen", color: "text-amber-500 dark:text-amber-300" };
  return {
    label: due.toLocaleDateString("de-DE", { day: "2-digit", month: "short" }),
    color: "text-muted-foreground",
  };
}

export default function CockpitPage() {
  const { toast } = useToast();
  const [reminderDialog, setReminderDialog] = useState(false);
  const [editReminder, setEditReminder] = useState<EnrichedReminder | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "overdue" | "done">("all");

  const { data: allReminders = [], isLoading } = useQuery<EnrichedReminder[]>({
    queryKey: ["/api/reminders"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/reminders");
      return r.json();
    },
  });

  const today = new Date().toISOString().split("T")[0];

  const overdueReminders = allReminders.filter((r) => r.dueDate < today && r.status !== "done");
  const todayReminders = allReminders.filter((r) => r.dueDate === today && r.status !== "done");
  const doneToday = allReminders.filter((r) => r.status === "done" && r.updatedAt?.startsWith(today));
  const pendingAll = allReminders.filter((r) => r.status !== "done");

  const filteredReminders = (() => {
    switch (activeFilter) {
      case "today": return allReminders.filter((r) => r.dueDate === today && r.status !== "done");
      case "overdue": return overdueReminders;
      case "done": return allReminders.filter((r) => r.status === "done");
      default: return allReminders.filter((r) => r.status !== "done").sort((a, b) => a.dueDate > b.dueDate ? 1 : -1);
    }
  })();

  const markDone = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/reminders/${id}`, { status: "done" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: "Erledigt ✓" });
    },
  });

  const snooze = useMutation({
    mutationFn: ({ id, dueDate }: { id: number; dueDate: string }) =>
      apiRequest("PATCH", `/api/reminders/${id}`, { status: "pending", dueDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: "Verschoben auf morgen" });
    },
  });

  const deleteReminder = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/reminders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      setDeleteId(null);
    },
  });

  const handleSnooze = (r: EnrichedReminder) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    snooze.mutate({ id: r.id, dueDate: tomorrow.toISOString().split("T")[0] });
  };

  const completionRate = pendingAll.length + doneToday.length > 0
    ? Math.round((doneToday.length / (pendingAll.length + doneToday.length)) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div className="w-1 h-10 rounded-full bg-amber-400 shrink-0 mt-0.5" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Tagescockpit</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => { setEditReminder(null); setReminderDialog(true); }}
        >
          <Plus className="w-3.5 h-3.5" /> Neue Wiedervorlage
        </Button>
      </div>

      {/* Status-Karten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveFilter("overdue")}
          className={cn(
            "rounded-xl border p-4 text-left transition-all hover:shadow-sm",
            activeFilter === "overdue" ? "border-destructive bg-destructive/5" : "bg-card"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-destructive">Überfällig</span>
          </div>
          {isLoading ? <Skeleton className="h-7 w-10" /> : (
            <p className="text-2xl font-black text-destructive">{overdueReminders.length}</p>
          )}
        </button>

        <button
          onClick={() => setActiveFilter("today")}
          className={cn(
            "rounded-xl border p-4 text-left transition-all hover:shadow-sm",
            activeFilter === "today" ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "bg-card"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="w-4 h-4 text-amber-500" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Heute</span>
          </div>
          {isLoading ? <Skeleton className="h-7 w-10" /> : (
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{todayReminders.length}</p>
          )}
        </button>

        <button
          onClick={() => setActiveFilter("done")}
          className={cn(
            "rounded-xl border p-4 text-left transition-all hover:shadow-sm",
            activeFilter === "done" ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "bg-card"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-green-600 dark:text-green-400">Erledigt</span>
          </div>
          {isLoading ? <Skeleton className="h-7 w-10" /> : (
            <p className="text-2xl font-black text-green-600 dark:text-green-400">{doneToday.length}</p>
          )}
        </button>

        <button
          onClick={() => setActiveFilter("all")}
          className={cn(
            "rounded-xl border p-4 text-left transition-all hover:shadow-sm",
            activeFilter === "all" ? "border-primary bg-primary/5" : "bg-card"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-primary">Abschlussquote</span>
          </div>
          {isLoading ? <Skeleton className="h-7 w-16" /> : (
            <p className="text-2xl font-black text-primary">{completionRate}%</p>
          )}
        </button>
      </div>

      {/* Aufgabenliste */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              {activeFilter === "all" && "Alle offenen Wiedervorlagen"}
              {activeFilter === "today" && "Heute fällig"}
              {activeFilter === "overdue" && "Überfällige Aufgaben"}
              {activeFilter === "done" && "Erledigte Aufgaben"}
              {filteredReminders.length > 0 && (
                <span className={cn(
                  "flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold",
                  activeFilter === "overdue"
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-secondary text-muted-foreground"
                )}>
                  {filteredReminders.length}
                </span>
              )}
            </CardTitle>
            {activeFilter !== "all" && (
              <button
                onClick={() => setActiveFilter("all")}
                className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
              >
                Alle anzeigen <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-50" />
              <p className="text-sm text-muted-foreground font-medium">
                {activeFilter === "done" ? "Noch nichts erledigt heute" : "Keine Aufgaben in dieser Kategorie"}
              </p>
              {activeFilter === "all" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 gap-1.5"
                  onClick={() => { setEditReminder(null); setReminderDialog(true); }}
                >
                  <Plus className="w-3.5 h-3.5" /> Erste Wiedervorlage erstellen
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReminders.map((r) => {
                const { label: dateLabel, color: dateColor } = daysLabel(r.dueDate);
                const isOverdue = r.dueDate < today && r.status !== "done";
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors",
                      r.status === "done"
                        ? "bg-muted/30 border-border opacity-60"
                        : isOverdue
                        ? "bg-destructive/5 border-destructive/30"
                        : "bg-secondary/30 border-border hover:bg-secondary/60"
                    )}
                  >
                    {/* Done toggle */}
                    <button
                      onClick={() => r.status !== "done" && markDone.mutate(r.id)}
                      className={cn(
                        "shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        r.status === "done"
                          ? "bg-green-500 border-green-500"
                          : isOverdue
                          ? "border-destructive hover:bg-destructive/20"
                          : "border-muted-foreground hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30"
                      )}
                      title={r.status === "done" ? "Erledigt" : "Als erledigt markieren"}
                    >
                      {r.status === "done" && <Check className="w-3 h-3 text-white" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/customers/${r.customerId}`}>
                          <a className="text-xs font-semibold text-primary hover:underline truncate">
                            {r.customerName}
                          </a>
                        </Link>
                        <span className={cn("text-[10px] font-semibold shrink-0", dateColor)}>
                          <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                          {dateLabel}
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm text-foreground truncate mt-0.5",
                        r.status === "done" && "line-through text-muted-foreground"
                      )}>
                        {r.description}
                      </p>
                    </div>

                    {/* Actions */}
                    {r.status !== "done" && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                          onClick={() => markDone.mutate(r.id)}
                        >
                          <Check className="w-3 h-3" /> Erledigt
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => handleSnooze(r)}
                          title="Auf morgen verschieben"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditReminder(r); setReminderDialog(true); }}
                          title="Bearbeiten"
                        >
                          ✏️
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(r.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                    {r.status === "done" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => setDeleteId(r.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminder Dialog */}
      <ReminderDialog
        open={reminderDialog}
        onClose={() => { setReminderDialog(false); setEditReminder(null); }}
        editReminder={editReminder}
      />

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wiedervorlage löschen?</AlertDialogTitle>
            <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteReminder.mutate(deleteId)}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
