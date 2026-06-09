import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Search, Users, Calendar, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer, Activity } from "@shared/schema";

const ACT_TYPES: Record<string, string> = {
  call: "Anruf", follow_up: "Follow-up", meeting: "Meeting", email: "E-Mail",
};

// Filter categories for the search
type FilterType = "all" | "customers" | "activities";

interface SearchResult {
  type: "customer" | "activity";
  id: number;
  customerId?: number;
  title: string;
  subtitle: string;
  href: string;
  score: number; // relevance score for ranking
}

/** Simple fuzzy-ish scoring: exact match > starts-with > contains */
function scoreMatch(text: string, q: string): number {
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  // Token-level: any word starts with query
  if (t.split(/\s+/).some((w) => w.startsWith(q))) return 70;
  return 0;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#FFD100]/40 text-foreground rounded px-0 not-italic">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: allActivities = [] } = useQuery<Activity[]>({ queryKey: ["/api/activities"] });

  const q = query.trim().toLowerCase();

  const results: SearchResult[] = useMemo(() => {
    if (q.length < 1) return [];
    const out: SearchResult[] = [];

    // Customers — search by company, contact, city, postal code (if stored in city), email, phone
    if (activeFilter === "all" || activeFilter === "customers") {
      customers.forEach((c) => {
        const fields = [
          { text: c.companyName, weight: 3 },
          { text: c.contactName ?? "", weight: 2 },
          { text: c.city ?? "", weight: 2 },
          { text: c.email ?? "", weight: 1 },
          { text: c.phone ?? "", weight: 1 },
          { text: c.industry ?? "", weight: 1 },
        ];
        const bestScore = fields.reduce((max, f) => {
          if (!f.text) return max;
          const s = scoreMatch(f.text, q) * f.weight;
          return s > max ? s : max;
        }, 0);
        if (bestScore > 0) {
          out.push({
            type: "customer",
            id: c.id,
            title: c.companyName,
            subtitle: [c.contactName, c.city, c.industry].filter(Boolean).join(" · "),
            href: `/customers/${c.id}`,
            score: bestScore,
          });
        }
      });
    }

    // Activities
    if (activeFilter === "all" || activeFilter === "activities") {
      allActivities.forEach((a) => {
        const fields = [
          { text: a.description ?? "", weight: 2 },
          { text: ACT_TYPES[a.type] ?? a.type, weight: 1 },
        ];
        const bestScore = fields.reduce((max, f) => {
          if (!f.text) return max;
          const s = scoreMatch(f.text, q) * f.weight;
          return s > max ? s : max;
        }, 0);
        if (bestScore > 0) {
          const cust = customers.find((c) => c.id === a.customerId);
          out.push({
            type: "activity",
            id: a.id,
            customerId: a.customerId,
            title: a.description ?? `${ACT_TYPES[a.type] ?? a.type}`,
            subtitle: [
              ACT_TYPES[a.type] ?? a.type,
              cust?.companyName,
              a.dueDate ? new Date(a.dueDate).toLocaleDateString("de-DE", { day: "2-digit", month: "short" }) : undefined,
            ].filter(Boolean).join(" · "),
            href: `/customers/${a.customerId}`,
            score: bestScore,
          });
        }
      });
    }

    // Sort by score descending, limit to 20
    return out.sort((a, b) => b.score - a.score).slice(0, 20);
  }, [q, activeFilter, customers, allActivities]);

  // Clamp selectedIdx when query or filter changes
  useEffect(() => {
    setSelectedIdx(0);
  }, [q, activeFilter]);

  function navigate_to(href: string) {
    navigate(href);
    onClose();
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      navigate_to(results[selectedIdx].href);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIdx(0);
      setActiveFilter("all");
    }
  }, [open]);

  const typeIcon = {
    customer: <Users className="w-3.5 h-3.5" />,
    activity: <Calendar className="w-3.5 h-3.5" />,
  };
  const typeColor = {
    customer: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    activity: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  };
  const typeLabel = { customer: "Kunde", activity: "Aktivität" };

  const filterTabs: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "Alle" },
    { key: "customers", label: "Kunden", count: results.filter((r) => r.type === "customer").length },
    { key: "activities", label: "Aktivitäten", count: results.filter((r) => r.type === "activity").length },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Schnellsuche</DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Firma, Kontakt, Stadt, Aktivität suchen…"
            className="border-0 shadow-none focus-visible:ring-0 p-0 text-sm h-auto placeholder:text-muted-foreground/60"
            data-testid="input-global-search"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Filter tabs — only show when there are results */}
        {q.length > 0 && results.length > 0 && (
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-muted/20">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
                  activeFilter === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {tab.label}
                {tab.key !== "all" && tab.count != null && tab.count > 0 && (
                  <span className={cn(
                    "text-[9px] font-bold px-1 rounded-full",
                    activeFilter === tab.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/20"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto">
          {q.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Tippe um zu suchen</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Firma · Kontakt · Stadt · Aktivitäten</p>
            </div>
          )}

          {q.length > 0 && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">Keine Ergebnisse für „{query}"</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Versuche einen anderen Suchbegriff</p>
            </div>
          )}

          {results.length > 0 && (
            <ul className="py-1.5">
              {results.map((r, i) => (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      i === selectedIdx
                        ? "bg-primary/8 dark:bg-primary/10"
                        : "hover:bg-muted/60",
                    )}
                    onClick={() => navigate_to(r.href)}
                    onMouseEnter={() => setSelectedIdx(i)}
                    data-testid={`search-result-${r.type}-${r.id}`}
                  >
                    {/* Type badge */}
                    <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0", typeColor[r.type])}>
                      {typeIcon[r.type]}
                      {typeLabel[r.type]}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {highlight(r.title, q)}
                      </p>
                      {r.subtitle && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {highlight(r.subtitle, q)}
                        </p>
                      )}
                    </div>

                    <ArrowRight className={cn(
                      "w-3.5 h-3.5 shrink-0 transition-opacity",
                      i === selectedIdx ? "text-primary opacity-100" : "text-muted-foreground opacity-0",
                    )} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-border bg-muted/30">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <kbd className="border border-border rounded px-1 font-mono text-[9px] bg-background">↑↓</kbd>
            Navigieren
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <kbd className="border border-border rounded px-1 font-mono text-[9px] bg-background">↵</kbd>
            Öffnen
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
            <kbd className="border border-border rounded px-1 font-mono text-[9px] bg-background">⌘K</kbd>
            Suche öffnen
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
