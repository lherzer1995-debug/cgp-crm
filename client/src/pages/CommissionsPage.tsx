import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Plus, Pencil, Trash2, Euro, Calendar, Download, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CommissionDialog from "@/components/CommissionDialog";
import { Progress } from "@/components/ui/progress";
import { API_BASE } from "@/lib/queryClient";
import type { Customer, Commission } from "@shared/schema";

interface AppSettings {
  monthlyCommissionQuota?: number | null;
}

const COMMISSION_TYPES: Record<string, string> = {
  sale: "Abschluss",
  renewal: "Verlängerung",
  upsell: "Upsell",
  other: "Sonstiges",
};

const TYPE_CLASS: Record<string, string> = {
  sale: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  renewal: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  upsell: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

interface CommissionWithCustomer extends Commission {
  customerName: string;
}

interface SummaryResponse {
  year: number;
  totalYear: number;
  summary: { month: number; monthLabel: string; total: number; count: number }[];
}

function formatEur(val: number) {
  return val.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CommissionsPage() {
  const { toast } = useToast();
  // Parse customerId from hash URL: /#/commissions?customerId=123
  const hashSearch = typeof window !== "undefined"
    ? window.location.hash.split("?")[1] ?? ""
    : "";
  const params = new URLSearchParams(hashSearch);
  const preselectedCustomerId = params.get("customerId")
    ? Number(params.get("customerId"))
    : undefined;

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterCustomer, setFilterCustomer] = useState<string>(
    preselectedCustomerId ? String(preselectedCustomerId) : "all"
  );
  const [filterType, setFilterType] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCommission, setEditCommission] = useState<Commission | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Queries
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: appSettings } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
  });

  const monthlyQuota = appSettings?.monthlyCommissionQuota ?? null;

  const handleExportCSV = () => {
    const url = `${API_BASE}/api/commissions/export?year=${selectedYear}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `provisionen-${selectedYear}.csv`;
    a.click();
  };

  const { data: summaryData } = useQuery<SummaryResponse>({
    queryKey: [`/api/commissions/summary?year=${selectedYear}`],
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/commissions/summary?year=${selectedYear}`);
      return r.json();
    },
  });

  const commissionQueryParams = new URLSearchParams();
  commissionQueryParams.set("year", String(selectedYear));
  if (filterMonth !== "all") commissionQueryParams.set("month", filterMonth);
  if (filterCustomer !== "all") commissionQueryParams.set("customerId", filterCustomer);

  const { data: commissions = [] } = useQuery<CommissionWithCustomer[]>({
    queryKey: [`/api/commissions?${commissionQueryParams.toString()}`],
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/commissions?${commissionQueryParams.toString()}`);
      return r.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/commissions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/commissions/summary"] });
      setDeleteId(null);
      toast({ title: "Provision gelöscht" });
    },
  });

  // Filter by type client-side (since API doesn't support type filter)
  const filtered = filterType === "all"
    ? commissions
    : commissions.filter((c) => c.type === filterType);

  const summary = summaryData?.summary ?? [];
  const totalYear = summaryData?.totalYear ?? 0;

  // Chart data: only months with data or current year months
  const chartData = summary.map((m) => ({
    name: m.monthLabel.slice(0, 3),
    Provision: m.total,
  }));

  // Trend: compare current month to previous month
  const now = new Date();
  const currentMonthIdx = now.getMonth(); // 0-based
  const currentMonthTotal = summary[currentMonthIdx]?.total ?? 0;
  const prevMonthTotal = currentMonthIdx > 0 ? (summary[currentMonthIdx - 1]?.total ?? 0) : 0;
  const trend = currentMonthTotal > prevMonthTotal ? "up"
    : currentMonthTotal < prevMonthTotal ? "down"
    : "neutral";

  // Average commission per sale
  const saleCommissions = commissions.filter((c) => c.type === "sale");
  const avgPerSale = saleCommissions.length > 0
    ? totalYear / summary.reduce((s, m) => s + m.count, 0)
    : 0;

  // Quota progress for current month
  const quotaPercent = monthlyQuota && monthlyQuota > 0
    ? Math.min(Math.round((currentMonthTotal / monthlyQuota) * 100), 200)
    : null;

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Provisionen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deine Verdienst-Übersicht und Provision-Tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExportCSV}
          >
            <Download className="w-4 h-4" /> CSV exportieren
          </Button>
          <Button
            className="gap-2"
            onClick={() => { setEditCommission(null); setDialogOpen(true); }}
          >
            <Plus className="w-4 h-4" /> Neue Provision
          </Button>
        </div>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground font-medium">Jahr:</span>
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total year */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Gesamt {selectedYear}
                </p>
                <p className="text-3xl font-black text-primary mt-1">
                  € {formatEur(totalYear)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Euro className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current month */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {summary[currentMonthIdx]?.monthLabel ?? "Aktueller Monat"}
                </p>
                <p className="text-3xl font-black text-foreground mt-1">
                  € {formatEur(currentMonthTotal)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
                  {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
                  {trend === "neutral" && <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
                  <span className={cn(
                    "text-[11px] font-semibold",
                    trend === "up" ? "text-green-600 dark:text-green-400"
                      : trend === "down" ? "text-destructive"
                      : "text-muted-foreground"
                  )}>
                    {trend === "up" ? "Mehr als Vormonat"
                      : trend === "down" ? "Weniger als Vormonat"
                      : "Wie Vormonat"}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Count */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Provisionen {selectedYear}
                </p>
                <p className="text-3xl font-black text-foreground mt-1">
                  {summary.reduce((s, m) => s + m.count, 0)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Einträge gesamt</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average per entry */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Ø pro Abschluss
                </p>
                <p className="text-3xl font-black text-foreground mt-1">
                  {summary.reduce((s, m) => s + m.count, 0) > 0
                    ? `€ ${formatEur(avgPerSale)}`
                    : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Durchschnitt {selectedYear}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Euro className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quota progress */}
      {quotaPercent !== null && selectedYear === currentYear && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  Monatsziel: {summary[currentMonthIdx]?.monthLabel}
                </p>
              </div>
              <span className={cn(
                "text-sm font-bold",
                quotaPercent >= 100 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
              )}>
                {quotaPercent}% erreicht
              </span>
            </div>
            <Progress value={Math.min(quotaPercent, 100)} className="h-2" />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              € {formatEur(currentMonthTotal)} von € {formatEur(monthlyQuota!)} Ziel
            </p>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold">
            Monatliche Provisionen {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `€${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                className="text-muted-foreground"
              />
              <Tooltip
                formatter={(value: number) => [`€ ${formatEur(value)}`, "Provision"]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="Provision" fill="#0052CC" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly summary table */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold">Monatsübersicht {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Monat</th>
                  <th className="text-right px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Verdienst</th>
                  <th className="text-right px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Anzahl</th>
                  <th className="text-right px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Trend</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((m, idx) => {
                  const prev = idx > 0 ? summary[idx - 1].total : null;
                  const t = prev === null ? "neutral"
                    : m.total > prev ? "up"
                    : m.total < prev ? "down"
                    : "neutral";
                  const isCurrentMonth = m.month === now.getMonth() + 1 && selectedYear === currentYear;
                  return (
                    <tr
                      key={m.month}
                      className={cn(
                        "border-b border-border/50 hover:bg-muted/40 transition-colors",
                        isCurrentMonth && "bg-primary/5"
                      )}
                    >
                      <td className="px-5 py-2.5 font-medium text-foreground">
                        {m.monthLabel}
                        {isCurrentMonth && (
                          <span className="ml-2 text-[10px] font-bold text-primary uppercase tracking-wide">
                            Aktuell
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-right font-bold text-foreground">
                        {m.total > 0 ? `€ ${formatEur(m.total)}` : (
                          <span className="text-muted-foreground font-normal">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-right text-muted-foreground">
                        {m.count > 0 ? m.count : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {t === "up" && <TrendingUp className="w-4 h-4 text-green-500 ml-auto" />}
                        {t === "down" && <TrendingDown className="w-4 h-4 text-destructive ml-auto" />}
                        {t === "neutral" && <Minus className="w-4 h-4 text-muted-foreground ml-auto" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="px-5 py-3 font-bold text-foreground">Gesamt</td>
                  <td className="px-5 py-3 text-right font-black text-primary text-base">
                    € {formatEur(totalYear)}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-foreground">
                    {summary.reduce((s, m) => s + m.count, 0)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Provision list with filters */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-semibold">Alle Provisionen</CardTitle>
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Monat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Monate</SelectItem>
                  {summary.map((m) => (
                    <SelectItem key={m.month} value={String(m.month)}>
                      {m.monthLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue placeholder="Kunde" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kunden</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  {Object.entries(COMMISSION_TYPES).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Euro className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Keine Provisionen gefunden</p>
              {filterMonth !== "all" || filterCustomer !== "all" || filterType !== "all" ? (
                <p className="text-xs mt-1">Filter anpassen oder zurücksetzen</p>
              ) : (
                <p className="text-xs mt-1">Erfasse deine erste Provision über einen Kunden</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Datum</th>
                    <th className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Kunde</th>
                    <th className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Typ</th>
                    <th className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Beschreibung</th>
                    <th className="text-right px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Betrag</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(c.date).toLocaleDateString("de-DE", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/customers/${c.customerId}`}>
                          <a className="font-medium text-foreground hover:text-primary hover:underline transition-colors">
                            {c.customerName}
                          </a>
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full",
                          TYPE_CLASS[c.type] ?? TYPE_CLASS.other
                        )}>
                          {COMMISSION_TYPES[c.type] ?? c.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground max-w-[200px] truncate">
                        {c.description ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-foreground whitespace-nowrap">
                        € {formatEur(c.amount)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => { setEditCommission(c); setDialogOpen(true); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteId(c.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission Dialog */}
      <CommissionDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditCommission(null); }}
        editCommission={editCommission}
      />

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Provision löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
