import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, Users, Activity, Clock, Target, CheckCircle2, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsOverview {
  total: number;
  leads: number;
  prospects: number;
  active: number;
  churned: number;
  conversionRate: number;
  activityByType: Record<string, number>;
  avgSalesCycleDays: number | null;
  monthlyActivities: { month: string; count: number }[];
  totalActivities: number;
  completedActivities: number;
}

interface ConversionData {
  byStatus: { lead: number; prospect: number; active: number; churned: number };
  leadToProspect: number;
  prospectToActive: number;
  overallConversion: number;
  trend: { month: string; leads: number; active: number; rate: number }[];
}

const ACT_TYPE_LABELS: Record<string, string> = {
  call: "Anruf", demo: "Demo", proposal: "Angebot", follow_up: "Follow-up",
  meeting: "Meeting", email: "E-Mail", closed_won: "Abschluss ✓", closed_lost: "Verloren",
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
  const { data: overview, isLoading: oLoad } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/analytics/overview"],
  });
  const { data: conversion, isLoading: cLoad } = useQuery<ConversionData>({
    queryKey: ["/api/analytics/conversion"],
  });

  const activityTypeData = overview
    ? Object.entries(overview.activityByType).map(([type, count]) => ({
        name: ACT_TYPE_LABELS[type] ?? type,
        count,
      }))
    : [];

  const pipelineData = overview
    ? [
        { name: "Lead", value: overview.leads, color: "#3b82f6" },
        { name: "Prospect", value: overview.prospects, color: "#f59e0b" },
        { name: "Aktiv", value: overview.active, color: "#22c55e" },
        { name: "Abgewandert", value: overview.churned, color: "#ef4444" },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-1 h-10 rounded-full bg-[#FFD100] shrink-0 mt-0.5" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Analytics & Reporting</h1>
          <p className="text-sm text-muted-foreground">Konversionsrate, Verkaufszyklus und Aktivitäts-Statistiken</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          label="Konversionsrate"
          value={oLoad ? "–" : `${overview?.conversionRate ?? 0} %`}
          sub="Lead → Aktiver Kunde"
          icon={Target}
          accent="bg-green-500"
          loading={oLoad}
        />
        <KpiCard
          label="Kunden gesamt"
          value={oLoad ? "–" : overview?.total ?? 0}
          sub={oLoad ? undefined : `${overview?.active ?? 0} aktiv · ${overview?.leads ?? 0} Leads`}
          icon={Users}
          accent="bg-primary"
          loading={oLoad}
        />
        <KpiCard
          label="Ø Verkaufszyklus"
          value={oLoad ? "–" : overview?.avgSalesCycleDays != null ? `${overview.avgSalesCycleDays} Tage` : "–"}
          sub="Erste bis letzte Aktivität"
          icon={Clock}
          accent="bg-amber-400"
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
      </div>

      {/* Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Konversions-Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {cLoad ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <>
                {[
                  { label: "Lead → Prospect/Aktiv", value: conversion?.leadToProspect ?? 0, color: "bg-blue-500" },
                  { label: "Prospect → Aktiv", value: conversion?.prospectToActive ?? 0, color: "bg-amber-500" },
                  { label: "Gesamt-Konversion", value: conversion?.overallConversion ?? 0, color: "bg-green-500" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-foreground font-medium">{label}</span>
                      <span className="text-xs font-bold text-foreground">{value} %</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", color)}
                        style={{ width: `${Math.min(value, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold mb-2">Pipeline-Verteilung</p>
                  {pipelineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={pipelineData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={2}>
                          {pipelineData.map((entry, index) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [value, name]} />
                        <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">Noch keine Daten</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Monthly Conversion Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Konversionsrate über Zeit
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {cLoad ? (
              <Skeleton className="h-48 w-full" />
            ) : (conversion?.trend?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={conversion!.trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: "12px", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any, name: string) => [
                      name === "rate" ? `${value} %` : value,
                      name === "rate" ? "Konversionsrate" : name === "leads" ? "Neue Kunden" : "Aktiv",
                    ]}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  <Line type="monotone" dataKey="leads" stroke="#0052CC" strokeWidth={2} dot={{ r: 3 }} name="Neue Kunden" />
                  <Line type="monotone" dataKey="active" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Aktiv" />
                  <Line type="monotone" dataKey="rate" stroke="#FFD100" strokeWidth={2} dot={{ r: 3 }} name="Rate %" strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Noch keine Daten für den Trend
              </div>
            )}
          </CardContent>
        </Card>
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

      {/* Status Summary Table */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Pipeline-Übersicht
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Anzahl</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Anteil</th>
                </tr>
              </thead>
              <tbody>
                {oLoad ? (
                  [1, 2, 3, 4].map((i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-8 ml-auto" /></td>
                      <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                    </tr>
                  ))
                ) : (
                  [
                    { label: "Lead", count: overview?.leads ?? 0, badge: "badge-lead" },
                    { label: "Prospect", count: overview?.prospects ?? 0, badge: "badge-prospect" },
                    { label: "Aktiv", count: overview?.active ?? 0, badge: "badge-active" },
                    { label: "Abgewandert", count: overview?.churned ?? 0, badge: "badge-churned" },
                  ].map(({ label, count, badge }) => (
                    <tr key={label} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={cn("text-[10px] border-0", badge)}>{label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">{count}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {(overview?.total ?? 0) > 0 ? `${Math.round((count / overview!.total) * 100)} %` : "–"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
