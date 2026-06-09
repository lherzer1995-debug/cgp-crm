import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Users, Activity, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsOverview {
  total: number;
  activityByType: Record<string, number>;
  monthlyActivities: { month: string; count: number }[];
  totalActivities: number;
  completedActivities: number;
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
  const { data: overview, isLoading: oLoad } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/analytics/overview"],
  });

  const activityTypeData = overview
    ? Object.entries(overview.activityByType).map(([type, count]) => ({
        name: ACT_TYPE_LABELS[type] ?? type,
        count,
      }))
    : [];

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
    </div>
  );
}
