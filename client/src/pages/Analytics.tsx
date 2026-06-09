import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Users, Activity, CheckCircle2, AlertTriangle, ShieldAlert, ShieldCheck, Shield, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRiskInfo, getRiskBadgeClass } from "@/lib/riskScoring";
import { useToast } from "@/hooks/use-toast";

interface AnalyticsOverview {
  total: number;
  activityByType: Record<string, number>;
  monthlyActivities: { month: string; count: number }[];
  totalActivities: number;
  completedActivities: number;
}

interface RiskCustomer {
  id: number;
  companyName: string;
  contactName: string;
  city: string | null;
  lastActivityDate: string | null;
  contractEnd: string | null;
  riskScore: number;
  riskCategory: "green" | "yellow" | "red";
  riskReasons: string[];
}

const ACT_TYPE_LABELS: Record<string, string> = {
  call: "Anruf", follow_up: "Follow-up", meeting: "Meeting", email: "E-Mail",
};

const COLORS = ["#0052CC", "#FFD100", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

function KpiCard({ label, value, sub, icon: Icon, accent, loading }: {
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
          <div className={cn("p-2 rounded-xl mt-0.5", accent + "/10")}>
            <Icon className={cn("w-5 h-5", accent.replace("bg-", "text-"))} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { toast } = useToast();

  const { data: overview, isLoading: oLoad } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/analytics/overview"],
  });

  const { data: atRiskCustomers = [], isLoading: riskLoad, refetch: refetchRisk } = useQuery<RiskCustomer[]>({
    queryKey: ["/api/analytics/at-risk-customers"],
  });

  const assessAllMutation = useMutation({
    mutationFn: async () => {
      // Fetch all customers and assess each
      const res = await apiRequest("GET", "/api/customers");
      const customers: { id: number }[] = await res.json();
      for (const c of customers) {
        try {
          await apiRequest("POST", `/api/customers/${c.id}/assess-risk`);
        } catch { /* skip individual failures */ }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/at-risk-customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Risk-Scores aktualisiert" });
    },
    onError: () => toast({ title: "Fehler bei der Risikobewertung", variant: "destructive" }),
  });

  const createTaskMutation = useMutation({
    mutationFn: ({ customerId, companyName }: { customerId: number; companyName: string }) =>
      apiRequest("POST", `/api/customers/${customerId}/activities`, {
        type: "follow_up",
        description: `Check-in: Risikobewertung für ${companyName} — Kontakt aufnehmen`,
        priority: "high",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        done: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Aufgabe erstellt" });
    },
    onError: () => toast({ title: "Fehler beim Erstellen der Aufgabe", variant: "destructive" }),
  });

  const activityTypeData = overview
    ? Object.entries(overview.activityByType).map(([type, count]) => ({
        name: ACT_TYPE_LABELS[type] ?? type,
        count,
      }))
    : [];

  // Risk distribution for pie chart
  const redCount = atRiskCustomers.filter((c) => c.riskCategory === "red").length;
  const yellowCount = atRiskCustomers.filter((c) => c.riskCategory === "yellow").length;
  const greenCount = (overview?.total ?? 0) - redCount - yellowCount;
  const riskPieData = [
    { name: "Sicher", value: Math.max(0, greenCount), color: "#22c55e" },
    { name: "Warnung", value: yellowCount, color: "#f59e0b" },
    { name: "Risiko", value: redCount, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-1 h-10 rounded-full bg-[#FFD100] shrink-0 mt-0.5" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Analytics & Reporting</h1>
          <p className="text-sm text-muted-foreground">Aktivitäts-Statistiken und Kunden-Übersicht</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        <KpiCard
          label="Kunden gesamt"
          value={oLoad ? "–" : overview?.total ?? 0}
          icon={Users}
          accent="bg-primary"
          loading={oLoad}
        />
        <KpiCard
          label="Aktivitäten gesamt"
          value={oLoad ? "–" : overview?.totalActivities ?? 0}
          sub={oLoad ? undefined : `${overview?.completedActivities ?? 0} erledigt`}
          icon={Activity}
          accent="bg-violet-500"
          loading={oLoad}
        />
        <KpiCard
          label="Erledigt"
          value={oLoad ? "–" : overview?.completedActivities ?? 0}
          sub={oLoad || !overview?.totalActivities ? undefined :
            `${Math.round((overview.completedActivities / overview.totalActivities) * 100)} % Abschlussrate`}
          icon={CheckCircle2}
          accent="bg-green-500"
          loading={oLoad}
        />
      </div>

      {/* Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activities per Month */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Aktivitäten pro Monat
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {oLoad ? (
              <Skeleton className="h-48 w-full" />
            ) : (overview?.monthlyActivities?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={overview!.monthlyActivities} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: "12px", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any) => [value, "Aktivitäten"]}
                  />
                  <Bar dataKey="count" fill="#0052CC" radius={[4, 4, 0, 0]} name="Aktivitäten" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Noch keine Aktivitäten
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity by Type */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Aktivitäten nach Typ
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {oLoad ? (
              <Skeleton className="h-48 w-full" />
            ) : activityTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activityTypeData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip
                    contentStyle={{ fontSize: "12px", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any) => [value, "Anzahl"]}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {activityTypeData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Noch keine Aktivitäten
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── PHASE 3: Risiko-Übersicht ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="w-1 h-8 rounded-full bg-red-500 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-foreground">Risiko-Übersicht</h2>
              <p className="text-xs text-muted-foreground">Problemkunden-Frühwarnung</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => assessAllMutation.mutate()}
            disabled={assessAllMutation.isPending}
            className="gap-2 text-xs"
          >
            {assessAllMutation.isPending ? (
              <><ShieldAlert className="w-3.5 h-3.5 animate-pulse" /> Berechne…</>
            ) : (
              <><ShieldAlert className="w-3.5 h-3.5" /> Alle neu bewerten</>
            )}
          </Button>
        </div>

        {/* Risk KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="h-1 bg-red-500" />
              <div className="p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Hohes Risiko</p>
                  {riskLoad ? <Skeleton className="h-7 w-12 mt-1.5" /> : (
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{redCount}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">Kunden</p>
                </div>
                <div className="p-2 rounded-xl bg-red-500/10 mt-0.5">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="h-1 bg-amber-400" />
              <div className="p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Warnung</p>
                  {riskLoad ? <Skeleton className="h-7 w-12 mt-1.5" /> : (
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{yellowCount}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">Kunden</p>
                </div>
                <div className="p-2 rounded-xl bg-amber-400/10 mt-0.5">
                  <Shield className="w-5 h-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="h-1 bg-green-500" />
              <div className="p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Sicher</p>
                  {oLoad || riskLoad ? <Skeleton className="h-7 w-12 mt-1.5" /> : (
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{Math.max(0, greenCount)}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">Kunden</p>
                </div>
                <div className="p-2 rounded-xl bg-green-500/10 mt-0.5">
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk table + pie chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top risk customers table */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Top Problemkunden
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {riskLoad ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : atRiskCustomers.length === 0 ? (
                <div className="text-center py-10">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-60" />
                  <p className="text-sm text-muted-foreground font-medium">Keine Risiko-Kunden</p>
                  <p className="text-xs text-muted-foreground mt-1">Alle Kunden sind im grünen Bereich</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Kunde</th>
                        <th className="text-center px-3 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Score</th>
                        <th className="text-left px-3 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Grund</th>
                        <th className="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {atRiskCustomers.slice(0, 10).map((c) => {
                        const info = getRiskInfo(c.riskScore);
                        return (
                          <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-foreground truncate max-w-[160px]">{c.companyName}</p>
                              {c.city && <p className="text-xs text-muted-foreground">{c.city}</p>}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold",
                                getRiskBadgeClass(c.riskScore)
                              )}>
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: info.color }} />
                                {c.riskScore}
                              </span>
                            </td>
                            <td className="px-3 py-3 hidden md:table-cell">
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {c.riskReasons.slice(0, 2).join(" · ") || "—"}
                              </p>
                            </td>
                            <td className="px-3 py-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => createTaskMutation.mutate({ customerId: c.id, companyName: c.companyName })}
                                disabled={createTaskMutation.isPending}
                              >
                                <Plus className="w-3 h-3" />
                                Aufgabe
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk distribution pie chart */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Risikoverteilung
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {oLoad || riskLoad ? (
                <Skeleton className="h-48 w-full" />
              ) : riskPieData.length > 0 ? (
                <div className="space-y-3">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={riskPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {riskPieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ fontSize: "12px", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                        formatter={(value: any, name: any) => [value, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5">
                    {riskPieData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="font-semibold text-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  Noch keine Daten
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
