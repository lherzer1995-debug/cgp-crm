import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Users, FileText, Calendar, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer, Note, Activity } from "@shared/schema";

const ACT_TYPES: Record<string, string> = {
  call: "Anruf", follow_up: "Follow-up", meeting: "Meeting", email: "E-Mail",
};

interface SearchResult {
  type: "customer" | "note" | "activity";
  id: number;
  customerId?: number;
  title: string;
  subtitle: string;
  href: string;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: allActivities = [] } = useQuery<Activity[]>({ queryKey: ["/api/activities"] });

  // We also need notes — fetch all customer notes in batch
  // For now we search customers + activities; notes are per-customer so we include them via customer titles
  const q = query.trim().toLowerCase();

  const results: SearchResult[] = [];

  if (q.length >= 1) {
    // Customers
    customers.forEach((c) => {
      const matchStr = [c.companyName, c.contactName, c.email, c.phone, c.city].join(" ").toLowerCase();
      if (matchStr.includes(q)) {
        results.push({
          type: "customer",
          id: c.id,
          title: c.companyName,
          subtitle: [c.contactName, c.city].filter(Boolean).join(" · "),
          href: `/customers/${c.id}`,
        });
      }
    });

    // Activities
    allActivities.forEach((a) => {
      const matchStr = [a.description, ACT_TYPES[a.type]].join(" ").toLowerCase();
      if (matchStr.includes(q)) {
        const cust = customers.find((c) => c.id === a.customerId);
        results.push({
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
        });
      }
    });
  }

  // Clamp selectedIdx
  useEffect(() => {
    setSelectedIdx(0);
  }, [q]);

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
    }
  }, [open]);

  const typeIcon = {
    customer: <Users className="w-3.5 h-3.5" />,
    note: <FileText className="w-3.5 h-3.5" />,
    activity: <Calendar className="w-3.5 h-3.5" />,
  };
  const typeColor = {
    customer: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    note: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    activity: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  };
  const typeLabel = { customer: "Kunde", note: "Notiz", activity: "Aktivität" };

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
            placeholder="Kunden, Aktivitäten, Notizen suchen…"
            className="border-0 shadow-none focus-visible:ring-0 p-0 text-sm h-auto placeholder:text-muted-foreground/60"
            data-testid="input-global-search"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto">
          {q.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Tippe um zu suchen</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Kunden · Aktivitäten</p>
            </div>
          )}

          {q.length > 0 && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">Keine Ergebnisse für „{query}"</p>
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
            <kbd className="border border-border rounded px-1 font-mono text-[9px] bg-background">/</kbd>
            Suche öffnen
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
