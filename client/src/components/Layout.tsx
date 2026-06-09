import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, Activity, Menu, X, Sun, Moon, Settings, CalendarClock, Search,
  BarChart2, Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Activity as ActivityType } from "@shared/schema";
import GlobalSearch from "./GlobalSearch";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Kunden", icon: Users },
  { href: "/activities", label: "Aufgaben", icon: Activity },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/data-management", label: "Daten", icon: Database },
  { href: "/settings", label: "Einstellungen", icon: Settings },
];

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
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Global "/" shortcut to open search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Don't trigger when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Badge: offene Aufgaben
  const { data: activities = [] } = useQuery<ActivityType[]>({ queryKey: ["/api/activities"] });
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
            <p className="text-[13px] font-bold text-foreground leading-tight tracking-tight">
              Commerz<span className="text-primary">Globalpay</span>
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
            <kbd className="text-[9px] font-mono border border-border rounded px-1 bg-background">/</kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto" role="navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? location === "/" : location.startsWith(href);
            const badge = href === "/activities" && openCount > 0 ? openCount : null;
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
              <span className="text-[11px] font-bold text-primary-foreground">LH</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-foreground truncate">Lars Herzer</p>
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
              {navItems.find((n) => (n.href === "/" ? location === "/" : location.startsWith(n.href)))?.label ?? "CRM"}
            </span>
            {/* Mobile logo */}
            <span className="md:hidden text-sm font-bold text-foreground">
              Commerz<span className="text-primary">Globalpay</span>
            </span>
          </div>

          {/* Search button in topbar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="h-8 w-8"
            data-testid="button-topbar-search"
            aria-label="Suche öffnen"
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
    </div>
  );
}
