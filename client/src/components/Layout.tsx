import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Activity, Menu, X, Sun, Moon, Settings, CalendarClock, Search,
  BarChart2, Database, ListChecks, TrendingUp, Bell, MapPin,
  Phone, Euro, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Activity as ActivityType, Reminder } from "@shared/schema";
import GlobalSearch from "./GlobalSearch";
import ActivityDialog from "./ActivityDialog";
import CommissionDialog from "./CommissionDialog";
import { checkOverdueTasks } from "@/lib/notifications";
import { API_BASE } from "@/lib/queryClient";

interface AppSettings {
  crmName: string;
  advisorName?: string;
}

// Primary nav: Cockpit first, then core workflow items
const primaryNavItems = [
  { href: "/", label: "Cockpit", icon: Bell },
  { href: "/customers", label: "Kunden", icon: Users },
  { href: "/map", label: "Karte", icon: MapPin },
  { href: "/tasks", label: "Aufgaben", icon: ListChecks },
  { href: "/settings", label: "Einstellungen", icon: Settings },
];

// Secondary nav: less-frequent pages, collapsed by default on mobile
const secondaryNavItems = [
  { href: "/activities", label: "Aktivitäten", icon: Activity },
  { href: "/commissions", label: "Provisionen", icon: TrendingUp },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dashboard", label: "Dashboard", icon: BarChart2 },
  { href: "/data-management", label: "Daten", icon: Database },
];

// All nav items combined (for active-label lookup in topbar)
const allNavItems = [...primaryNavItems, ...secondaryNavItems];

function CommerzLogo() {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 shrink-0">
      <rect width="36" height="36" rx="7" fill="#0052CC"/>
      <polygon points="18,6 29,18 18,30 7,18" fill="#FFD100"/>
      <polygon points="18,12 23,18 18,24 13,18" fill="white"/>
    </svg>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [secondaryExpanded, setSecondaryExpanded] = useState(false);
  const [quickActivityOpen, setQuickActivityOpen] = useState(false);
  const [quickCommissionOpen, setQuickCommissionOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Global "/" and Cmd+K / Ctrl+K shortcut to open search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      // Cmd+K / Ctrl+K — always works
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      // "/" — only when not in an input
      if (!isInput && e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // CRM name from settings
  const { data: appSettings } = useQuery<AppSettings>({ queryKey: ["/api/settings"] });
  const crmName = appSettings?.crmName ?? "CGP CRM";
  const advisorName = appSettings?.advisorName ?? "Lars Herzer";
  const advisorInitials = advisorName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  // Badge: überfällige Aufgaben
  const { data: activities = [] } = useQuery<ActivityType[]>({ queryKey: ["/api/activities"] });

  // Badge: überfällige Wiedervorlagen
  const { data: overdueReminders = [] } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders/overdue"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/reminders/overdue`);
      return r.json();
    },
    staleTime: 60_000,
  });

  // Check overdue tasks and send notifications if enabled
  useEffect(() => {
    const enabled = localStorage.getItem("notificationsEnabled") === "true";
    if (activities.length > 0) {
      checkOverdueTasks(
        activities.filter((a) => !a.done).map((a) => ({
          id: a.id,
          description: a.description,
          dueDate: a.dueDate ?? "",
          dueTime: a.dueTime,
        })),
        enabled,
      );
    }
  }, [activities]);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdueCount = activities.filter((a) => {
    if (a.done || !a.dueDate) return false;
    const due = new Date(a.dueDate); due.setHours(0, 0, 0, 0);
    return due < today;
  }).length;
  const openCount = activities.filter((a) => !a.done && a.dueDate).length;

  // Nächste fällige Aufgabe
  const nextDue = activities
    .filter((a) => !a.done && a.dueDate)
    .sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1))[0];

  const toggleDark = () => setDark((d) => !d);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Global Search Modal */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <CommerzLogo />
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-foreground leading-tight tracking-tight truncate">
              {crmName}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-0.5">CRM System</p>
          </div>
        </div>

        {/* Quick search button in sidebar */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => setSearchOpen(true)}
            data-testid="button-sidebar-search"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-sm transition-colors border border-border/50"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 text-left text-[12px]">Suchen…</span>
            <kbd className="text-[9px] font-mono border border-border rounded px-1 bg-background">⌘K</kbd>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="px-3 pb-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1 mb-1.5">Schnellaktionen</p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => { setQuickActivityOpen(true); setSidebarOpen(false); }}
              className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors text-center"
              title="Neue Aktivität"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="text-[9px] font-semibold leading-tight">Aktivität</span>
            </button>
            <button
              onClick={() => { setQuickCommissionOpen(true); setSidebarOpen(false); }}
              className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors text-center"
              title="Neue Provision"
            >
              <Euro className="w-3.5 h-3.5" />
              <span className="text-[9px] font-semibold leading-tight">Provision</span>
            </button>
            <button
              onClick={() => { setSearchOpen(true); setSidebarOpen(false); }}
              className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors text-center"
              title="Suche"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-[9px] font-semibold leading-tight">Suche</span>
            </button>
          </div>
        </div>

        {/* Primary Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto" role="navigation">
          {primaryNavItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? location === "/" : location.startsWith(href);
            const badge =
              href === "/tasks" && overdueCount > 0 ? overdueCount :
              href === "/" && overdueReminders.length > 0 ? overdueReminders.length :
              null;
            return (
              <Link key={href} href={href}>
                <a
                  data-testid={`nav-${label.toLowerCase()}`}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {badge}
                    </span>
                  )}
                </a>
              </Link>
            );
          })}

          {/* Secondary Nav toggle */}
          <button
            onClick={() => setSecondaryExpanded((v) => !v)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground/70 hover:text-muted-foreground hover:bg-secondary/60 transition-colors mt-1"
          >
            <span className="flex-1 text-left uppercase tracking-widest text-[9px]">Weitere</span>
            {secondaryExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {secondaryExpanded && (
            <div className="space-y-0.5">
              {secondaryNavItems.map(({ href, label, icon: Icon }) => {
                const active = location.startsWith(href);
                return (
                  <Link key={href} href={href}>
                    <a
                      data-testid={`nav-${label.toLowerCase()}`}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{label}</span>
                    </a>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Nächste Aufgabe */}
        {nextDue && (
          <div className="px-3 pb-2">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <CalendarClock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">Nächste Aufgabe</p>
              </div>
              <p className="text-[12px] text-amber-900 dark:text-amber-200 font-medium truncate">{nextDue.description}</p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                {new Date(nextDue.dueDate!).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" })}
                {nextDue.dueTime ? ` · ${nextDue.dueTime} Uhr` : ""}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-primary-foreground">{advisorInitials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-foreground truncate">{advisorName}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                <p className="text-[10px] text-muted-foreground">Berater · CGP</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:ml-64 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card shrink-0 h-12">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="button-sidebar-toggle"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>

          <div className="flex items-center gap-2 flex-1">
            <div className="w-1 h-4 rounded-full bg-[#FFD100] hidden md:block" />
            <span className="text-xs text-muted-foreground font-semibold hidden md:block">
              {allNavItems.find((n) => (n.href === "/" ? location === "/" : location.startsWith(n.href)))?.label ?? "CRM"}
            </span>
            {/* Mobile logo */}
            <span className="md:hidden text-sm font-bold text-foreground">
              {crmName}
            </span>
          </div>

          {/* Quick action buttons in topbar */}
          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuickActivityOpen(true)}
              className="h-8 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              title="Neue Aktivität"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Aktivität</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuickCommissionOpen(true)}
              className="h-8 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              title="Neue Provision"
            >
              <Euro className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Provision</span>
            </Button>
          </div>

          {/* Search button in topbar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="h-8 w-8"
            data-testid="button-topbar-search"
            aria-label="Suche öffnen (⌘K)"
          >
            <Search className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDark}
            className="h-8 w-8"
            data-testid="button-theme-toggle"
            aria-label="Theme wechseln"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Global Quick Action Dialogs */}
      <ActivityDialog
        open={quickActivityOpen}
        onClose={() => setQuickActivityOpen(false)}
      />
      <CommissionDialog
        open={quickCommissionOpen}
        onClose={() => setQuickCommissionOpen(false)}
      />
    </div>
  );
}
