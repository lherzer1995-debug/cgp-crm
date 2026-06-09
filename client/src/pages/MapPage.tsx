/**
 * MapPage – Kartenansicht aller Kunden mit Leaflet + OpenStreetMap.
 *
 * Features:
 * - Alle Kunden als farbige Marker (Grün/Gelb/Rot nach Status)
 * - Marker-Clustering bei Zoom-Out
 * - Klick auf Marker → Popup mit Kundendetails + "Profil öffnen"
 * - Filter: Stadt, Branche, Status, Radius
 * - "Meine Position" Button (Geolocation API)
 * - Tagesroutenplanung: Kunden auswählen → Google Maps Route
 * - Responsive: Sidebar + Karte auf Desktop, Drawer auf Mobile
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/queryClient";
import { geocodeAddress, haversineDistance, type Coordinates } from "@/lib/geocoding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  MapPin, Navigation, Route, Filter, Loader2,
  ExternalLink, X, SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MapCustomer {
  id: number;
  companyName: string;
  contactName: string;
  city: string | null;
  country: string | null;
  industry: string | null;
  lastActivityDate: string | null;
  contractEnd: string | null;
}

interface CustomerWithCoords extends MapCustomer {
  coords: Coordinates | null;
  status: "active" | "inactive" | "churn";
  geocodeFailed: boolean;
}

type StatusFilter = "active" | "inactive" | "churn";

// ── Status helpers ────────────────────────────────────────────────────────────

function getCustomerStatus(c: MapCustomer): "active" | "inactive" | "churn" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Churn risk: contract ends within 30 days
  if (c.contractEnd) {
    const end = new Date(c.contractEnd);
    end.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
    if (daysLeft <= 30) return "churn";
  }

  // Inactive: no activity for > 60 days
  if (c.lastActivityDate) {
    const last = new Date(c.lastActivityDate);
    const daysSince = Math.ceil((today.getTime() - last.getTime()) / 86_400_000);
    if (daysSince > 60) return "inactive";
  } else {
    // No activity at all → inactive
    return "inactive";
  }

  return "active";
}

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  inactive: "#f59e0b",
  churn: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  inactive: "Inaktiv",
  churn: "Churn-Risiko",
};

// ── SVG Marker icon factory ───────────────────────────────────────────────────

function createMarkerIcon(color: string, selected = false): string {
  const border = selected ? "#1d4ed8" : "#fff";
  const strokeW = selected ? 3 : 1.5;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z"
        fill="${color}" stroke="${border}" stroke-width="${strokeW}"/>
      <circle cx="14" cy="14" r="5" fill="white" opacity="0.9"/>
    </svg>
  `)}`;
}

function createFailedMarkerIcon(): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z"
        fill="#94a3b8" stroke="#fff" stroke-width="1.5"/>
      <text x="14" y="19" text-anchor="middle" font-size="12" fill="white" font-family="sans-serif">?</text>
    </svg>
  `)}`;
}

// ── Google Maps route URL builder ─────────────────────────────────────────────

function buildGoogleMapsRouteUrl(stops: CustomerWithCoords[]): string {
  const withCoords = stops.filter((s) => s.coords);
  if (withCoords.length === 0) return "";
  if (withCoords.length === 1) {
    const c = withCoords[0].coords!;
    return `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`;
  }
  const origin = `${withCoords[0].coords!.lat},${withCoords[0].coords!.lng}`;
  const dest = withCoords[withCoords.length - 1].coords!;
  const destination = `${dest.lat},${dest.lng}`;
  const waypoints = withCoords
    .slice(1, -1)
    .map((s) => `${s.coords!.lat},${s.coords!.lng}`)
    .join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ""}&travelmode=driving`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const radiusCircleRef = useRef<any>(null);

  // Data
  const { data: rawCustomers = [], isLoading } = useQuery<MapCustomer[]>({
    queryKey: ["/api/customers/map-data"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/customers/map-data`);
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const [customers, setCustomers] = useState<CustomerWithCoords[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodedCount, setGeocodedCount] = useState(0);

  // Filters
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [statusFilters, setStatusFilters] = useState<Set<StatusFilter>>(
    new Set(["active", "inactive", "churn"])
  );
  const [radiusKm, setRadiusKm] = useState<string>("");
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);

  // Route planning
  const [routeIds, setRouteIds] = useState<Set<number>>(new Set());
  const [routePlanMode, setRoutePlanMode] = useState(false);

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Popup state (for custom popup panel)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithCoords | null>(null);

  // ── Derived lists ───────────────────────────────────────────────────────────

  const allCities = Array.from(
    new Set(rawCustomers.map((c) => c.city).filter(Boolean) as string[])
  ).sort();

  const allIndustries = Array.from(
    new Set(rawCustomers.map((c) => c.industry).filter(Boolean) as string[])
  ).sort();

  // ── Geocode all customers ───────────────────────────────────────────────────

  useEffect(() => {
    if (!rawCustomers.length) return;

    let cancelled = false;
    setGeocoding(true);
    setGeocodedCount(0);

    (async () => {
      const results: CustomerWithCoords[] = [];
      for (let i = 0; i < rawCustomers.length; i++) {
        if (cancelled) break;
        const c = rawCustomers[i];
        const coords = await geocodeAddress(c.city, c.country ?? "Deutschland");
        results.push({
          ...c,
          coords,
          status: getCustomerStatus(c),
          geocodeFailed: coords === null,
        });
        setGeocodedCount(i + 1);
        // Small delay to respect Nominatim rate limit (1 req/s)
        if (i < rawCustomers.length - 1) await new Promise((r) => setTimeout(r, 300));
      }
      if (!cancelled) {
        setCustomers(results);
        setGeocoding(false);
      }
    })();

    return () => { cancelled = true; };
  }, [rawCustomers]);

  // ── Filtered customers ──────────────────────────────────────────────────────

  const filteredCustomers = customers.filter((c) => {
    if (cityFilter !== "all" && c.city !== cityFilter) return false;
    if (industryFilter !== "all" && c.industry !== industryFilter) return false;
    if (!statusFilters.has(c.status)) return false;
    if (radiusKm && userPosition && c.coords) {
      const dist = haversineDistance(userPosition, c.coords);
      if (dist > parseFloat(radiusKm)) return false;
    }
    return true;
  });

  // ── Init Leaflet map ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    // Dynamic import to avoid SSR issues
    import("leaflet").then((L) => {
      // Fix default icon paths broken by bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [51.1657, 10.4515], // Germany center
        zoom: 6,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = map;
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // ── Update markers when filtered customers change ───────────────────────────

  useEffect(() => {
    if (!leafletMapRef.current) return;

    import("leaflet").then(async (L) => {
      const map = leafletMapRef.current;
      if (!map) return;

      // Remove old cluster group
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }

      // Try to use MarkerClusterGroup if available
      let group: any;
      try {
        // @ts-ignore
        const MC = await import("leaflet.markercluster");
        // @ts-ignore
        group = (L as any).markerClusterGroup({
          maxClusterRadius: 60,
          iconCreateFunction: (cluster: any) => {
            const count = cluster.getChildCount();
            const markers: any[] = cluster.getAllChildMarkers();
            const hasChurn = markers.some((m: any) => m.options._status === "churn");
            const hasInactive = markers.some((m: any) => m.options._status === "inactive");
            const color = hasChurn ? "#ef4444" : hasInactive ? "#f59e0b" : "#22c55e";
            return (L as any).divIcon({
              html: `<div style="background:${color};color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${count}</div>`,
              className: "",
              iconSize: [36, 36],
            });
          },
        });
      } catch {
        // Fallback: plain LayerGroup without clustering
        group = L.layerGroup();
      }

      filteredCustomers.forEach((c) => {
        if (!c.coords) return;

        const isSelected = routeIds.has(c.id);
        const iconUrl = c.geocodeFailed
          ? createFailedMarkerIcon()
          : createMarkerIcon(STATUS_COLORS[c.status], isSelected);

        const icon = L.icon({
          iconUrl,
          iconSize: [28, 36],
          iconAnchor: [14, 36],
          popupAnchor: [0, -36],
          _status: c.status,
        } as any);

        const marker = L.marker([c.coords.lat, c.coords.lng], {
          icon,
          title: c.companyName,
          _status: c.status,
        } as any);

        marker.on("click", () => {
          setSelectedCustomer(c);
        });

        group.addLayer(marker);
      });

      group.addTo(map);
      clusterGroupRef.current = group;
    });
  }, [filteredCustomers, routeIds]);

  // ── User position marker & radius circle ────────────────────────────────────

  useEffect(() => {
    if (!leafletMapRef.current) return;
    import("leaflet").then((L) => {
      const map = leafletMapRef.current;
      if (!map) return;

      // Remove old
      if (userMarkerRef.current) { map.removeLayer(userMarkerRef.current); userMarkerRef.current = null; }
      if (radiusCircleRef.current) { map.removeLayer(radiusCircleRef.current); radiusCircleRef.current = null; }

      if (!userPosition) return;

      const userIcon = L.divIcon({
        html: `<div style="background:#3b82f6;border:3px solid white;border-radius:50%;width:16px;height:16px;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      userMarkerRef.current = L.marker([userPosition.lat, userPosition.lng], { icon: userIcon })
        .bindTooltip("Meine Position", { permanent: false })
        .addTo(map);

      if (radiusKm && parseFloat(radiusKm) > 0) {
        radiusCircleRef.current = L.circle([userPosition.lat, userPosition.lng], {
          radius: parseFloat(radiusKm) * 1000,
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.08,
          weight: 2,
          dashArray: "6 4",
        }).addTo(map);
      }
    });
  }, [userPosition, radiusKm]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPosition(coords);
        setLocating(false);
        if (leafletMapRef.current) {
          leafletMapRef.current.setView([coords.lat, coords.lng], 11);
        }
      },
      () => setLocating(false),
      { timeout: 10_000 }
    );
  }, []);

  const handleCenterMap = useCallback(() => {
    if (!leafletMapRef.current) return;
    const visible = filteredCustomers.filter((c) => c.coords);
    if (visible.length === 0) {
      leafletMapRef.current.setView([51.1657, 10.4515], 6);
      return;
    }
    import("leaflet").then((L) => {
      const bounds = L.latLngBounds(visible.map((c) => [c.coords!.lat, c.coords!.lng]));
      leafletMapRef.current.fitBounds(bounds, { padding: [40, 40] });
    });
  }, [filteredCustomers]);

  const toggleStatusFilter = (s: StatusFilter) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const toggleRouteId = (id: number) => {
    setRouteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handlePlanRoute = () => {
    const stops = filteredCustomers.filter((c) => routeIds.has(c.id));
    if (stops.length < 2) return;
    const url = buildGoogleMapsRouteUrl(stops);
    if (url) window.open(url, "_blank");
  };

  // ── Sidebar content ─────────────────────────────────────────────────────────

  const SidebarContent = () => (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {(["active", "inactive", "churn"] as StatusFilter[]).map((s) => {
          const count = customers.filter((c) => c.status === s).length;
          return (
            <div
              key={s}
              className={cn(
                "rounded-lg border px-2 py-2 text-center cursor-pointer transition-all",
                statusFilters.has(s)
                  ? s === "active" ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800/40"
                    : s === "inactive" ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40"
                    : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/40"
                  : "bg-muted/40 border-border opacity-50"
              )}
              onClick={() => toggleStatusFilter(s)}
            >
              <div className="text-lg font-bold text-foreground">{count}</div>
              <div className="text-[10px] text-muted-foreground font-medium">{STATUS_LABELS[s]}</div>
            </div>
          );
        })}
      </div>

      {/* Geocoding progress */}
      {geocoding && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
          <span>Geocoding {geocodedCount}/{rawCustomers.length}…</span>
        </div>
      )}

      {/* City filter */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Stadt</Label>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Alle Städte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Städte</SelectItem>
            {allCities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Industry filter */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Branche</Label>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Alle Branchen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Branchen</SelectItem>
            {allIndustries.map((ind) => (
              <SelectItem key={ind} value={ind}>{ind}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status filter checkboxes */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Status</Label>
        <div className="space-y-2">
          {(["active", "inactive", "churn"] as StatusFilter[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <Checkbox
                id={`status-${s}`}
                checked={statusFilters.has(s)}
                onCheckedChange={() => toggleStatusFilter(s)}
              />
              <label htmlFor={`status-${s}`} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: STATUS_COLORS[s] }}
                />
                {STATUS_LABELS[s]}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Radius filter */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Radius-Filter
        </Label>
        <div className="flex gap-2">
          <Input
            type="number"
            min="1"
            max="500"
            placeholder="km"
            value={radiusKm}
            onChange={(e) => setRadiusKm(e.target.value)}
            className="h-8 text-sm w-20"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 flex-1 text-xs"
            onClick={handleLocate}
            disabled={locating}
          >
            {locating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Navigation className="w-3 h-3 mr-1" />}
            Meine Position
          </Button>
        </div>
        {userPosition && (
          <p className="text-[11px] text-muted-foreground">
            Position gesetzt · {radiusKm ? `${radiusKm} km Radius` : "Kein Radius"}
          </p>
        )}
        {radiusKm && !userPosition && (
          <p className="text-[11px] text-amber-600">Bitte zuerst Position setzen</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-2 pt-1">
        <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={handleCenterMap}>
          <MapPin className="w-3 h-3 mr-1.5" />
          Karte zentrieren
        </Button>
        <Button
          variant={routePlanMode ? "default" : "outline"}
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => {
            setRoutePlanMode((v) => !v);
            if (routePlanMode) setRouteIds(new Set());
          }}
        >
          <Route className="w-3 h-3 mr-1.5" />
          {routePlanMode ? "Route abbrechen" : "Route planen"}
        </Button>
        {routePlanMode && routeIds.size >= 2 && (
          <Button size="sm" className="w-full h-8 text-xs bg-[#0052CC] hover:bg-[#0047b3]" onClick={handlePlanRoute}>
            <ExternalLink className="w-3 h-3 mr-1.5" />
            In Google Maps öffnen ({routeIds.size} Stops)
          </Button>
        )}
      </div>

      {/* Route planning customer list */}
      {routePlanMode && (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Kunden auswählen
          </Label>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {filteredCustomers.filter((c) => c.coords).map((c) => (
              <div
                key={c.id}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm",
                  routeIds.has(c.id)
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted/60"
                )}
                onClick={() => toggleRouteId(c.id)}
              >
                <Checkbox checked={routeIds.has(c.id)} onCheckedChange={() => toggleRouteId(c.id)} />
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: STATUS_COLORS[c.status] }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium">{c.companyName}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{c.city}</p>
                </div>
              </div>
            ))}
            {filteredCustomers.filter((c) => c.coords).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Keine Kunden mit Koordinaten</p>
            )}
          </div>
        </div>
      )}

      {/* Filtered count */}
      <div className="mt-auto pt-2 border-t border-border">
        <p className="text-[11px] text-muted-foreground text-center">
          {filteredCustomers.length} von {customers.length} Kunden angezeigt
        </p>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full -m-4 md:-m-6 lg:-m-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-bold text-foreground">Kartenansicht</h1>
          {!isLoading && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {customers.length} Kunden
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 text-[11px] text-muted-foreground">
            {(["active", "inactive", "churn"] as StatusFilter[]).map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[s] }} />
                {STATUS_LABELS[s]}
              </span>
            ))}
          </div>
          {/* Mobile filter button */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="md:hidden h-8 text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                Filter
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-4">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-sm">Filter & Optionen</SheetTitle>
              </SheetHeader>
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Body: sidebar + map */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-72 shrink-0 border-r border-border bg-card p-4 overflow-y-auto">
          <SidebarContent />
        </aside>

        {/* Map container */}
        <div className="flex-1 relative">
          {/* Loading overlay */}
          {(isLoading || geocoding) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 bg-card border border-border rounded-xl px-6 py-5 shadow-lg">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">
                  {isLoading ? "Kundendaten laden…" : `Geocoding ${geocodedCount}/${rawCustomers.length}…`}
                </p>
                {geocoding && (
                  <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${rawCustomers.length ? (geocodedCount / rawCustomers.length) * 100 : 0}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Leaflet map */}
          <div ref={mapRef} className="w-full h-full" />

          {/* Customer popup panel */}
          {selectedCustomer && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-20">
              <div className="bg-card border border-border rounded-xl shadow-xl p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: STATUS_COLORS[selectedCustomer.status] }}
                      />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {STATUS_LABELS[selectedCustomer.status]}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-foreground truncate">{selectedCustomer.companyName}</h3>
                    <p className="text-xs text-muted-foreground">{selectedCustomer.contactName}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {selectedCustomer.city && (
                    <div>
                      <span className="text-muted-foreground">Stadt</span>
                      <p className="font-medium text-foreground">{selectedCustomer.city}</p>
                    </div>
                  )}
                  {selectedCustomer.industry && (
                    <div>
                      <span className="text-muted-foreground">Branche</span>
                      <p className="font-medium text-foreground">{selectedCustomer.industry}</p>
                    </div>
                  )}
                  {selectedCustomer.lastActivityDate && (
                    <div>
                      <span className="text-muted-foreground">Letzte Aktivität</span>
                      <p className="font-medium text-foreground">
                        {new Date(selectedCustomer.lastActivityDate).toLocaleDateString("de-DE", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                  {selectedCustomer.contractEnd && (
                    <div>
                      <span className="text-muted-foreground">Vertragsende</span>
                      <p className="font-medium text-foreground">
                        {new Date(selectedCustomer.contractEnd).toLocaleDateString("de-DE", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs bg-[#0052CC] hover:bg-[#0047b3]"
                    onClick={() => {
                      window.open(`/#/customers/${selectedCustomer.id}`, "_blank");
                    }}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Profil öffnen
                  </Button>
                  {routePlanMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-7 text-xs px-2",
                        routeIds.has(selectedCustomer.id) && "border-primary text-primary"
                      )}
                      onClick={() => toggleRouteId(selectedCustomer.id)}
                    >
                      <Route className="w-3 h-3 mr-1" />
                      {routeIds.has(selectedCustomer.id) ? "Entfernen" : "Route"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* No results hint */}
          {!isLoading && !geocoding && customers.length > 0 && filteredCustomers.length === 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-card border border-border rounded-lg px-4 py-2.5 shadow-md text-sm text-muted-foreground flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" />
                Keine Kunden für aktive Filter
              </div>
            </div>
          )}

          {/* Failed geocoding hint */}
          {!geocoding && customers.some((c) => c.geocodeFailed) && (
            <div className="absolute top-4 right-4 z-10">
              <div className="bg-card border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2 shadow-md text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                {customers.filter((c) => c.geocodeFailed).length} Kunden ohne Koordinaten
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
