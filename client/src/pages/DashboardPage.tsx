import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users, Euro, ArrowRight, Clock,
  CalendarClock, CheckCircle2, CheckSquare, Square, Building2, AlertCircle,
  Bell, AlertTriangle, Check, TrendingUp, UserCheck, ListChecks, TrendingDown, Minus,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { Customer, Activity, Reminder } from "@shared/schema";
import { cn } from "@/lib/utils";
import { BriefingCard } from "@/components/BriefingCard";
import { formatTrend } from "@/lib/briefingHelpers";

const ACT_LABEL: Record<string, string> = {
  call: "Anruf", follow_up: "Follow-up", meeting: "Meeting", email: "E-Mail",
};
const ACT_CLASS: Record<string, string> = {
  call: "act-call", follow_up: "act-follow_up",
  meeting: "text-indigo-600 dark:text-indigo-400", email: "text-cyan-600 dark:text-cyan-400",
};

function StatCard({ label, value, sub, icon: Icon, accent, loading }: {
  label: string; value: string | number; sub?: string;
  icon: any; accent: string; loading: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className={cn("h-1 w-full", accent)} />
        <div className="p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
            {loading ? (
              <Skeleton className="h-7 w-20 mt-1.5" />
            ) : (
              <p className="text-2xl font-bold text-foreground mt-1 leading-none">{value}</p>
            )}
            {sub && !loading && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={cn("p-2 rounded-xl mt-0.5 opacity-90", accent.replace("bg-", "bg-") + "/10")}>
            <Icon className={cn("w-5 h-5", accent.replace("bg-", "text-"))} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function dueDateLabel(dueDate: string, dueTime?: string | null): { label: string; urgent: boolean } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  const timeStr = dueTime ? ` · ${dueTime} Uhr` : "";
  if (diff < 0) return { label: `Überfällig${timeStr}`, urgent: true };
  if (diff === 0) return { label: `Heute${timeStr}`, urgent: true };
  if (diff === 1) return { label: `Morgen${timeStr}`, urgent: false };
  return {
    label: due.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" }) + timeStr,
    urgent: false,
  };
}

type EnrichedReminder = Reminder & { customerName: string };

type TodayStats = {
  openTasks: number;
  overdueTasks: number;
  todayTasks: number;
  weekTasks: number;
  todayReminders: number;
  commissionsToday: number;
  customersContactedToday: number;
};

type MonthlyForecast = {
  expectedCommissions: number;
  churnRiskCount: number;
  upsellOpportunities: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
  commissionHistory: { month: string; total: number }[];
  recommendations: string[];
  forecastText: string;
};

export default function DashboardPage() {
  const { data: customers = [], isLoading: cLoad } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: activities = [], isLoading: aLoad } = useQuery<Activity[]>({ queryKey: ["/api/activities"] });
  const { data: reminders = [], isLoading: rLoad } = useQuery<EnrichedReminder[]>({
    queryKey: ["/api/reminders"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/reminders");
      return r.json();
    },
  });
  const { data: todayStats, isLoading: tLoad } = useQuery<TodayStats>({
    queryKey: ["/api/dashboard/today"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/dashboard/today");
      return r.json();
    },
    refetchInterval: 60_000, // refresh every minute
  });

  const [forecastLoading, setForecastLoading] = React.useState(false);
  const [forecast, setForecast] = React.useState<MonthlyForecast | null>(null);

  const loadForecast = async () => {
    setForecastLoading(true);
    try {
      const r = await apiRequest("GET", "/api/briefing/monthly");
      const data = await r.json();
      setForecast(data);
    } catch {
      // silently fail
    } finally {
      setForecastLoading(false);
    }
  };

  const custMap = Object.fromEntries(customers.map((c) => [c.id, c]));

  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) =>
      apiRequest("PATCH", `/api/activities/${id}`, { done }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/activities"] }),
  });

  const totalVol = customers.reduce((s, c) => s + (c.paymentVolume || 0), 0);

  const today = new Date().toISOString().split("T")[0];
  const overdueReminders = reminders.filter((r) => r.dueDate < today && r.status !== "done");
  const todayReminders = reminders.filter((r) => r.dueDate === today && r.status !== "done");
  const topReminders = [...overdueReminders, ...todayReminders].slice(0, 3);

  // Aufgaben sortiert nach Datum
  const pending = activities
    .filter((a) => !a.done)
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate > b.dueDate ? 1 : -1;
    })
    .slice(0, 8);

  const overdue = pending.filter((a) => {
    if (!a.dueDate) return false;
    const due = new Date(a.dueDate); due.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return due < today;
  }).length;

  const recent = [...customers].reverse().slice(0, 5);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="w-1 h-10 rounded-full bg-[#FFD100] shrink-0 mt-0.5" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        {overdue > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs font-semibold text-destructive">{overdue} überfällig</span>
          </div>
        )}
      </div>

      {/* KPI-Reihe */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        <StatCard label="Kunden gesamt" value={customers.length} icon={Users}
          accent="bg-primary" loading={cLoad} />
        <StatCard label="Offene Aufgaben" value={pending.length} icon={Clock}
          accent={overdue > 0 ? "bg-destructive" : "bg-amber-400"} loading={aLoad}
          sub={overdue > 0 ? `${overdue} überfällig` : "Alle im Plan"} />
        <StatCard label="Monatl. Volumen" value={`€ ${totalVol.toLocaleString("de-DE")}`}
          icon={Euro} accent="bg-primary" loading={cLoad} />
      </div>

      {/* Tagescockpit KPIs */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-[#FFD100]" />
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-amber-500" />
            Tagescockpit
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col p-3 rounded-lg bg-secondary/40 border border-border">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Heute fällig</span>
              {tLoad ? <Skeleton className="h-6 w-12" /> : (
                <span className="text-xl font-black text-foreground">{todayStats?.todayTasks ?? 0}</span>
              )}
              <span className="text-[10px] text-muted-foreground mt-0.5">Aufgaben</span>
            </div>
            <div className={cn("flex flex-col p-3 rounded-lg border", (todayStats?.overdueTasks ?? 0) > 0 ? "bg-destructive/5 border-destructive/30" : "bg-secondary/40 border-border")}>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Überfällig</span>
              {tLoad ? <Skeleton className="h-6 w-12" /> : (
                <span className={cn("text-xl font-black", (todayStats?.overdueTasks ?? 0) > 0 ? "text-destructive" : "text-foreground")}>
                  {todayStats?.overdueTasks ?? 0}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground mt-0.5">Aufgaben</span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-secondary/40 border border-border">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Diese Woche</span>
              {tLoad ? <Skeleton className="h-6 w-12" /> : (
                <span className="text-xl font-black text-foreground">{todayStats?.weekTasks ?? 0}</span>
              )}
              <span className="text-[10px] text-muted-foreground mt-0.5">Aufgaben</span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-800/30">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Wiedervorlagen</span>
              {tLoad ? <Skeleton className="h-6 w-12" /> : (
                <span className="text-xl font-black text-amber-600 dark:text-amber-400">{todayStats?.todayReminders ?? 0}</span>
              )}
              <span className="text-[10px] text-muted-foreground mt-0.5">Heute fällig</span>
            </div>
          </div>
          {todayStats && (todayStats.commissionsToday > 0 || todayStats.customersContactedToday > 0) && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {todayStats.commissionsToday > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50/60 dark:bg-green-950/20 border border-green-200/40 dark:border-green-800/30">
                  <TrendingUp className="w-4 h-4 text-green-600 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Provisionen heute</p>
                    <p className="text-sm font-black text-green-600 dark:text-green-400">
                      € {todayStats.commissionsToday.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              )}
              {todayStats.customersContactedToday > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/40 dark:border-blue-800/30">
                  <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Kontaktiert heute</p>
                    <p className="text-sm font-black text-blue-600 dark:text-blue-400">{todayStats.customersContactedToday} Kunden</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tagescockpit Vorschau */}
      {(overdueReminders.length > 0 || todayReminders.length > 0) && (
        <Card className="overflow-hidden">
          <div className="h-1 bg-amber-400" />
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                Tagescockpit
                {overdueReminders.length > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {overdueReminders.length}
                  </span>
                )}
              </CardTitle>
              <Link href="/cockpit">
                <a className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                  Alle <ArrowRight className="w-3 h-3" />
                </a>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {rLoad ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
            ) : (
              <div className="space-y-1.5">
                {topReminders.map((r) => {
                  const isOverdue = r.dueDate < today;
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg",
                        isOverdue ? "bg-destructive/5 border border-destructive/20" : "bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-800/30"
                      )}
                    >
                      {isOverdue
                        ? <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                        : <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <Link href={`/customers/${r.customerId}`}>
                          <a className="text-[10px] font-semibold text-primary hover:underline">{r.customerName}</a>
                        </Link>
                        <p className="text-xs text-foreground truncate">{r.description}</p>
                      </div>
                      <span className={cn(
                        "text-[10px] font-semibold shrink-0",
                        isOverdue ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                      )}>
                        {isOverdue ? "Überfällig" : "Heute"}
                      </span>
                    </div>
                  );
                })}
                {(overdueReminders.length + todayReminders.length) > 3 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{overdueReminders.length + todayReminders.length - 3} weitere im Cockpit
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mittlere Reihe */}
      <div className="grid grid-cols-1 gap-4">

        {/* Aufgaben */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-500" />
                Offene Aufgaben
                {pending.length > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {pending.length}
                  </span>
                )}
              </CardTitle>
              <Link href="/activities">
                <a className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                  Alle <ArrowRight className="w-3 h-3" />
                </a>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {aLoad ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
            ) : pending.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-60" />
                <p className="text-sm text-muted-foreground font-medium">Alles erledigt!</p>
                <p className="text-xs text-muted-foreground mt-0.5">Keine offenen Aufgaben</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {pending.map((a) => {
                  const cust = custMap[a.customerId];
                  const due = a.dueDate ? dueDateLabel(a.dueDate, a.dueTime) : null;
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary/40 hover:bg-secondary/80 transition-colors group"
                    >
                      <button
                        onClick={() => toggle.mutate({ id: a.id, done: true })}
                        className="shrink-0 text-muted-foreground hover:text-green-500 transition-colors"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-[10px] font-bold uppercase tracking-wide shrink-0", ACT_CLASS[a.type] ?? "text-muted-foreground")}>
                            {ACT_LABEL[a.type] ?? a.type}
                          </span>
                          {cust && (
                            <span className="text-[11px] text-muted-foreground font-medium truncate">{cust.companyName}</span>
                          )}
                        </div>
                        <p className="text-sm text-foreground truncate mt-0.5">{a.description}</p>
                      </div>
                      {due && (
                        <span className={cn(
                          "text-[11px] font-semibold shrink-0 px-2 py-0.5 rounded-full",
                          due.urgent
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {due.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Zuletzt hinzugefügt */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Zuletzt hinzugefügt
            </CardTitle>
            <Link href="/customers">
              <a className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                Alle Kunden <ArrowRight className="w-3 h-3" />
              </a>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {cLoad ? (
            <div className="px-4 pb-4 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : recent.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-sm text-muted-foreground">Noch keine Kunden angelegt</p>
              <Link href="/customers">
                <a className="text-xs text-primary hover:underline mt-1 inline-block font-medium">Ersten Kunden anlegen →</a>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((c) => (
                <Link key={c.id} href={`/customers/${c.id}`}>
                  <a className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/40 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {c.companyName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.companyName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.contactName}{c.city ? ` · ${c.city}` : ""}
                        {c.selectedProduct ? ` · ${c.selectedProduct}` : ""}
                      </p>
                    </div>
                    {c.paymentVolume ? (
                      <span className="text-xs font-semibold text-foreground shrink-0 hidden sm:block">
                        € {c.paymentVolume.toLocaleString("de-DE")}
                      </span>
                    ) : null}
                  </a>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── PHASE 3: KI-Briefings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BriefingCard
          type="daily"
          title="KI-Tagesbriefing"
          description="Personalisiertes Briefing mit Aufgaben, Risiken und Empfehlungen"
        />
        <BriefingCard
          type="weekly"
          title="Wochenzusammenfassung"
          description="Rückblick auf die Woche und Prioritäten für nächste Woche"
        />
      </div>

      {/* ── PHASE 3: Monatliche Prognose ── */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-violet-500 to-[#0052CC]" />
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              Monatliche Prognose
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={loadForecast}
              disabled={forecastLoading}
              className="gap-2 text-xs"
            >
              {forecastLoading ? (
                <><Minus className="w-3.5 h-3.5 animate-spin" /> Berechne…</>
              ) : (
                <><TrendingUp className="w-3.5 h-3.5" /> {forecast ? "Aktualisieren" : "Prognose laden"}</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {forecastLoading ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
              </div>
              <Skeleton className="h-40 w-full" />
            </div>
          ) : forecast ? (
            <div className="space-y-4">
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col p-3 rounded-lg bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200/40 dark:border-violet-800/30">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Erwartete Provisionen</span>
                  <span className="text-xl font-black text-violet-600 dark:text-violet-400">
                    € {forecast.expectedCommissions.toLocaleString("de-DE")}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">nächster Monat</span>
                </div>
                <div className={cn(
                  "flex flex-col p-3 rounded-lg border",
                  forecast.churnRiskCount > 0
                    ? "bg-red-50/60 dark:bg-red-950/20 border-red-200/40 dark:border-red-800/30"
                    : "bg-secondary/40 border-border"
                )}>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Churn-Risiko</span>
                  <span className={cn(
                    "text-xl font-black",
                    forecast.churnRiskCount > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
                  )}>
                    {forecast.churnRiskCount}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Verträge &lt; 30 Tage</span>
                </div>
                <div className="flex flex-col p-3 rounded-lg bg-green-50/60 dark:bg-green-950/20 border border-green-200/40 dark:border-green-800/30">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Upsell-Chancen</span>
                  <span className="text-xl font-black text-green-600 dark:text-green-400">
                    {forecast.upsellOpportunities}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">inaktive Kunden</span>
                </div>
              </div>

              {/* Trend + Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Provisions-Trend (6 Monate)</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={forecast.commissionHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ fontSize: "12px", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                        formatter={(v: any) => [`€ ${Number(v).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`, "Provisionen"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        fill="url(#commGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Recommendations */}
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Empfehlungen</p>
                  <ul className="space-y-1.5">
                    {forecast.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                        <span className="w-4 h-4 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {r}
                      </li>
                    ))}
                  </ul>
                  {forecast.trendPercent !== 0 && (() => {
                    const t = formatTrend(forecast.trendPercent);
                    return (
                      <div className={cn("mt-3 flex items-center gap-1.5 text-xs font-semibold", t.className)}>
                        {forecast.trend === "up" ? <TrendingUp className="w-3.5 h-3.5" /> : forecast.trend === "down" ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        Trend: {t.label} vs. Vorquartal
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground font-medium">Monatliche Prognose</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                KI-gestützte Analyse: Provisionen, Churn-Risiko und Upsell-Chancen
              </p>
              <Button size="sm" onClick={loadForecast} disabled={forecastLoading} className="gap-2">
                <TrendingUp className="w-3.5 h-3.5" /> Prognose generieren
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
