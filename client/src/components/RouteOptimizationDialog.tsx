import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Navigation, Clock, Route, ExternalLink, Save, Loader2, CheckCircle2,
} from "lucide-react";
import type { Customer } from "@shared/schema";
import type { OptimizedRoute } from "@/lib/routeOptimization";
import { formatDuration, formatDistance, buildGoogleMapsUrl } from "@/lib/routeOptimization";
import { cn } from "@/lib/utils";

interface RouteOptimizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RouteOptimizationDialog({ open, onOpenChange }: RouteOptimizationDialogProps) {
  const { toast } = useToast();
  const [startLocation, setStartLocation] = useState("Frankfurt am Main");
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<OptimizedRoute | null>(null);
  const [search, setSearch] = useState("");

  const { data: customers = [], isLoading: cLoad } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.companyName.toLowerCase().includes(q) ||
      (c.city ?? "").toLowerCase().includes(q)
    );
  });

  const toggleCustomer = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  const handleOptimize = async () => {
    if (selectedIds.size === 0) {
      toast({ title: "Keine Kunden ausgewählt", variant: "destructive" });
      return;
    }
    if (!startLocation.trim()) {
      toast({ title: "Startort erforderlich", variant: "destructive" });
      return;
    }
    setOptimizing(true);
    setResult(null);
    try {
      const res = await apiRequest("POST", "/api/routes/optimize", {
        customerIds: Array.from(selectedIds),
        startLocation: startLocation.trim(),
        routeDate,
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      toast({
        title: "Optimierung fehlgeschlagen",
        description: err.message || "Bitte Städte der Kunden prüfen",
        variant: "destructive",
      });
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await apiRequest("POST", "/api/routes/save", {
        routeDate: result.routeDate,
        startLocation: result.startLocation,
        customerIds: Array.from(selectedIds),
        optimizedOrder: result.optimizedOrder,
        totalDistanceKm: result.totalDistanceKm,
        estimatedDurationMin: result.totalEstimatedMinutes,
      });
      toast({ title: "Route gespeichert" });
    } catch (err: any) {
      toast({ title: "Fehler beim Speichern", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenMaps = () => {
    if (!result) return;
    const url = buildGoogleMapsUrl(result.startLocation, result.stops);
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="w-4 h-4 text-[#0052CC]" />
            Tagesroute optimieren
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Config */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-loc">Startort</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  id="start-loc"
                  className="pl-9"
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  placeholder="z.B. Frankfurt am Main"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="route-date">Datum</Label>
              <Input
                id="route-date"
                type="date"
                value={routeDate}
                onChange={(e) => setRouteDate(e.target.value)}
              />
            </div>
          </div>

          {/* Customer selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Kunden auswählen ({selectedIds.size} ausgewählt)</Label>
              <Button variant="ghost" size="sm" onClick={toggleAll} className="h-7 text-xs">
                {selectedIds.size === filtered.length ? "Alle abwählen" : "Alle auswählen"}
              </Button>
            </div>
            <Input
              placeholder="Kunden suchen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
              {cLoad ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Keine Kunden gefunden</div>
              ) : (
                filtered.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/40 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.has(c.id)}
                      onCheckedChange={() => toggleCustomer(c.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.companyName}</p>
                      {c.city && <p className="text-xs text-muted-foreground">{c.city}</p>}
                    </div>
                    {!c.city && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                        Keine Stadt
                      </Badge>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Optimize button */}
          <Button
            onClick={handleOptimize}
            disabled={optimizing || selectedIds.size === 0}
            className="w-full gap-2"
          >
            {optimizing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Optimiere Route…</>
            ) : (
              <><Navigation className="w-4 h-4" /> Route optimieren ({selectedIds.size} Kunden)</>
            )}
          </Button>

          {/* Result */}
          {result && (
            <div className="space-y-3 border-t border-border pt-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Route className="w-4 h-4 text-primary mb-1" />
                  <span className="text-lg font-black text-primary">{formatDistance(result.totalDistanceKm)}</span>
                  <span className="text-[10px] text-muted-foreground">Gesamt-Distanz</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/40">
                  <Clock className="w-4 h-4 text-amber-600 mb-1" />
                  <span className="text-lg font-black text-amber-600">{formatDuration(result.totalEstimatedMinutes)}</span>
                  <span className="text-[10px] text-muted-foreground">Fahrzeit</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-green-50/60 dark:bg-green-950/20 border border-green-200/40">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mb-1" />
                  <span className="text-lg font-black text-green-600">{result.stops.length}</span>
                  <span className="text-[10px] text-muted-foreground">Stopps</span>
                </div>
              </div>

              {/* Route table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="text-left px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">#</th>
                      <th className="text-left px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Kunde</th>
                      <th className="text-left px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Stadt</th>
                      <th className="text-right px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Distanz</th>
                      <th className="text-right px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Fahrzeit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border bg-secondary/20">
                      <td className="px-3 py-2 text-muted-foreground">0</td>
                      <td className="px-3 py-2 font-medium text-muted-foreground" colSpan={4}>
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {result.startLocation} (Start)
                      </td>
                    </tr>
                    {result.stops.map((stop, i) => (
                      <tr key={stop.customerId} className={cn("border-b border-border last:border-0", i % 2 === 0 ? "" : "bg-secondary/20")}>
                        <td className="px-3 py-2 font-bold text-primary">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{stop.companyName}</td>
                        <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{stop.city ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-mono text-sm">{formatDistance(stop.distanceFromPrevKm)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground hidden sm:table-cell">{formatDuration(stop.estimatedTravelMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleOpenMaps} className="flex-1 gap-2">
                  <ExternalLink className="w-4 h-4" />
                  In Google Maps öffnen
                </Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Route speichern
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
