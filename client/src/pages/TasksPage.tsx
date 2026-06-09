import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckSquare,
  Square,
  Calendar,
  ExternalLink,
  ListChecks,
  CalendarCheck,
  Search,
  X,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Activity as ActivityType, Customer } from "@shared/schema";

// ── Constants ─────────────────────────────────────────────────────────────────

const ACT_TYPES: Record<string, string> = {
  call: "Anruf",
  demo: "Demo",
  proposal: "Angebot",
  follow_up: "Follow-up",
  meeting: "Meeting",
  email: "E-Mail",
  closed_won: "Abschluss ✓",
  closed_lost: "Verloren",
};

const ACT_CLASS: Record<string, string> = {
  call: "act-call",
  demo: "act-demo",
  proposal: "act-proposal",
  follow_up: "act-follow_up",
  closed_won: "act-closed_won",
  closed_lost: "act-closed_lost",
  meeting: "text-indigo-600 dark:text-indigo-400",
  email: "text-cyan-600 dark:text-cyan-400",
};

type DueDateFilter = "all" | "overdue" | "today" | "week";
type StatusFilter = "open" | "done" | "all";
type SortKey = "dueDate" | "customer" | "type";

// ── Date helpers ──────────────────────────────────────────────────────────────

function getDueDateGroup(
  dueDate?: string | null,
): "overdue" | "today" | "week" | "later" | "none" {
  if (!dueDate) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 7) return "week";
  return "later";
}

function formatDueDate(dueDate: string, dueTime?: string | null): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  let label: string;
  if (diff === 0) label = "Heute";
  else if (diff === 1) label = "Morgen";
  else if (diff === -1) label = "Gestern";
  else
    label = new Date(dueDate).toLocaleDateString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });

  return dueTime ? `${label} · ${dueTime} Uhr` : label;
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <AlertTriangle className="w-10 h-10 text-destructive opacity-70" />
      <div>
        <p className="text-sm font-semibold text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Daten konnten nicht geladen werden.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="w-3.5 h-3.5" />
        Erneut versuchen
      </Button>
    </div>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({
  activity,
  customer,
  onToggle,
  isToggling,
}: {
  activity: ActivityType;
  customer?: Customer;
  onToggle: (id: number, done: boolean) => void;
  isToggling: boolean;
}) {
  const group = getDueDateGroup(activity.dueDate);
  const dateStr = activity.dueDate
    ? formatDueDate(activity.dueDate, activity.dueTime)
    : null;

  const stripeColor = activity.done
    ? "bg-muted"
    : group === "overdue"
      ? "bg-destructive"
      : group === "today"
        ? "bg-amber-400"
        : group === "week"
          ? "bg-primary"
          : "bg-muted-foreground/30";

  const dateBadgeClass = activity.done
    ? "text-muted-foreground bg-muted/50"
    : group === "overdue"
      ? "text-destructive bg-destructive/10"
      : group === "today"
        ? "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40"
        : "text-muted-foreground bg-muted/50";

  return (
    <Card className={cn("transition-all", activity.done && "opacity-50")}>
      <CardContent className="p-0">
        <div className="flex items-stretch">
          {/* Color stripe */}
          <div className={cn("w-1 rounded-l-lg shrink-0", stripeColor)} />

          <div className="flex items-center gap-3 px-3 py-3 flex-1 min-w-0">
            {/* Checkbox */}
            <button
              onClick={() => onToggle(activity.id, !activity.done)}
              disabled={isToggling}
              className="shrink-0 text-muted-foreground hover:text-green-500 transition-colors disabled:opacity-50"
              aria-label={activity.done ? "Als offen markieren" : "Als erledigt markieren"}
            >
              {activity.done ? (
                <CheckSquare className="w-5 h-5 text-green-500" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide shrink-0",
                    ACT_CLASS[activity.type] ?? "text-muted-foreground",
                  )}
                >
                  {ACT_TYPES[activity.type] ?? activity.type}
                </span>
                {customer && (
                  <span className="text-[11px] text-muted-foreground font-semibold truncate max-w-[160px]">
                    {customer.companyName}
                  </span>
                )}
                {activity.calendarEventId && (
                  <CalendarCheck
                    className="w-3 h-3 text-green-500 shrink-0"
                    title="Im Google Kalender"
                  />
                )}
              </div>
              <p
                className={cn(
                  "text-sm text-foreground mt-0.5 truncate",
                  activity.done && "line-through text-muted-foreground",
                )}
              >
                {activity.description}
              </p>
            </div>

            {/* Right side: date + link */}
            <div className="flex items-center gap-2 shrink-0">
              {dateStr && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full",
                    dateBadgeClass,
                  )}
                >
                  <Calendar className="w-3 h-3" />
                  <span className="hidden sm:inline">{dateStr}</span>
                  <span className="sm:hidden">
                    {group === "overdue"
                      ? "Überfällig"
                      : group === "today"
                        ? "Heute"
                        : dateStr}
                  </span>
                </div>
              )}
              {customer && (
                <Link href={`/customers/${customer.id}`}>
                  <a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={`Zu ${customer.companyName}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");

  const {
    data: activities = [],
    isLoading: activitiesLoading,
    isError: activitiesError,
    error: activitiesErrorObj,
    refetch: refetchActivities,
  } = useQuery<ActivityType[]>({ queryKey: ["/api/activities"] });

  const {
    data: customers = [],
    isLoading: customersLoading,
    isError: customersError,
    refetch: refetchCustomers,
  } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const custMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers],
  );

  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) =>
      apiRequest("PATCH", `/api/activities/${id}`, { done }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] }),
  });

  // ── Derived stats ──────────────────────────────────────────────────────────
  const overdueCount = useMemo(
    () =>
      activities.filter(
        (a) => !a.done && getDueDateGroup(a.dueDate) === "overdue",
      ).length,
    [activities],
  );
  const openCount = activities.filter((a) => !a.done).length;
  const doneCount = activities.filter((a) => a.done).length;

  // ── Filtering + sorting ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...activities];

    // Status
    if (statusFilter === "open") list = list.filter((a) => !a.done);
    else if (statusFilter === "done") list = list.filter((a) => a.done);

    // Due date
    if (dueDateFilter !== "all") {
      list = list.filter((a) => getDueDateGroup(a.dueDate) === dueDateFilter);
    }

    // Customer
    if (customerFilter !== "all") {
      list = list.filter((a) => String(a.customerId) === customerFilter);
    }

    // Type
    if (typeFilter !== "all") {
      list = list.filter((a) => a.type === typeFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.description.toLowerCase().includes(q) ||
          custMap[a.customerId]?.companyName.toLowerCase().includes(q) ||
          custMap[a.customerId]?.contactName.toLowerCase().includes(q),
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortKey === "dueDate") {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate > b.dueDate ? 1 : -1;
      }
      if (sortKey === "customer") {
        const ca = custMap[a.customerId]?.companyName ?? "";
        const cb = custMap[b.customerId]?.companyName ?? "";
        return ca.localeCompare(cb, "de");
      }
      if (sortKey === "type") {
        return (ACT_TYPES[a.type] ?? a.type).localeCompare(
          ACT_TYPES[b.type] ?? b.type,
          "de",
        );
      }
      return 0;
    });

    return list;
  }, [
    activities,
    statusFilter,
    dueDateFilter,
    customerFilter,
    typeFilter,
    searchQuery,
    sortKey,
    custMap,
  ]);

  const isLoading = activitiesLoading || customersLoading;
  const isError = activitiesError || customersError;
  const errorMessage =
    (activitiesErrorObj as any)?.message ??
    "Daten konnten nicht geladen werden.";

  const hasActiveFilters =
    statusFilter !== "open" ||
    dueDateFilter !== "all" ||
    customerFilter !== "all" ||
    typeFilter !== "all" ||
    searchQuery.trim() !== "";

  function resetFilters() {
    setStatusFilter("open");
    setDueDateFilter("all");
    setCustomerFilter("all");
    setTypeFilter("all");
    setSearchQuery("");
    setSortKey("dueDate");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-1 h-10 rounded-full bg-[#FFD100] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">Aufgaben</h1>
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[11px] font-bold">
                <AlertTriangle className="w-3 h-3" />
                {overdueCount} überfällig
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {openCount > 0 ? `${openCount} offen` : "Alles erledigt"}
            {doneCount > 0 ? ` · ${doneCount} erledigt` : ""}
            {filtered.length !== activities.length
              ? ` · ${filtered.length} angezeigt`
              : ""}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Aufgabe oder Kunde suchen…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Suche löschen"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2">
          {/* Status */}
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Offen</SelectItem>
              <SelectItem value="done">Erledigt</SelectItem>
              <SelectItem value="all">Alle</SelectItem>
            </SelectContent>
          </Select>

          {/* Due date */}
          <Select
            value={dueDateFilter}
            onValueChange={(v) => setDueDateFilter(v as DueDateFilter)}
          >
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Fälligkeit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Daten</SelectItem>
              <SelectItem value="overdue">Überfällig</SelectItem>
              <SelectItem value="today">Heute</SelectItem>
              <SelectItem value="week">Diese Woche</SelectItem>
            </SelectContent>
          </Select>

          {/* Customer */}
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Kunde" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kunden</SelectItem>
              {customers
                .slice()
                .sort((a, b) =>
                  a.companyName.localeCompare(b.companyName, "de"),
                )
                .map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.companyName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* Type */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              {Object.entries(ACT_TYPES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={sortKey}
            onValueChange={(v) => setSortKey(v as SortKey)}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Sortierung" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dueDate">Nach Fälligkeit</SelectItem>
              <SelectItem value="customer">Nach Kunde</SelectItem>
              <SelectItem value="type">Nach Typ</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
              Filter zurücksetzen
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          message={errorMessage}
          onRetry={() => {
            refetchActivities();
            refetchCustomers();
          }}
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-30" />
          {activities.length === 0 ? (
            <>
              <p className="text-sm font-medium">Noch keine Aufgaben</p>
              <p className="text-xs mt-1">
                Füge Aktivitäten über die Kundendetailseite hinzu
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Keine Aufgaben gefunden</p>
              <p className="text-xs mt-1">
                Passe die Filter an oder{" "}
                <button
                  onClick={resetFilters}
                  className="underline hover:text-foreground transition-colors"
                >
                  setze sie zurück
                </button>
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((activity) => (
            <TaskRow
              key={activity.id}
              activity={activity}
              customer={custMap[activity.customerId]}
              onToggle={(id, done) => toggle.mutate({ id, done })}
              isToggling={toggle.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
