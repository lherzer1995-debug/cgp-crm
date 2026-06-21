"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Route, Navigation, Sparkles, Clock, Car } from "lucide-react";
import { apiClient } from "@/lib/api";

interface MapMarker {
  id: string; name: string; lat: number; lng: number;
  city: string; priority: number; status: string;
  lastVisit: string;
}

export default function MapPage() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<MapMarker | null>(null);
  const [routeMode, setRouteMode] = useState(false);

  useEffect(() => {
    loadMarkers();
  }, []);

  async function loadMarkers() {
    try {
      const data = await apiClient.maps.customers();
      setMarkers(data as any);
    } catch (err) {
      console.error("Load markers error", err);
    } finally {
      setLoading(false);
    }
  }

  const hasMarkers = markers.length > 0;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-display-sm gradient-text">Karte & Routen</h2>
          <p className="text-sm text-white/40 mt-1">
            {markers.length} Kundenstandorte
          </p>
        </div>
        <button
          onClick={() => setRouteMode(!routeMode)}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all ${
            routeMode
              ? "bg-accent-500/10 text-accent-400 border border-accent-500/20"
              : "btn-secondary"
          }`}
        >
          <Route className="w-4 h-4" />
          Routen-Modus
        </button>
      </div>

      {/* Map Container */}
      <div className="glass-panel overflow-hidden relative" style={{ height: "calc(100vh - 240px)" }}>
        {!hasMarkers ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <MapPin className="w-16 h-16 text-white/[0.04] mb-4" />
            <p className="text-white/30 text-sm">Keine Standorte verfügbar</p>
            <p className="text-white/20 text-xs mt-1">Füge Kunden mit Adressen hinzu</p>
          </div>
        ) : (
          <div className="absolute inset-0 bg-[#0d0d14]">
            {/* Premium Map Placeholder */}
            <svg className="w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(43,159,255,0.03)" />
                  <stop offset="100%" stopColor="rgba(43,159,255,0)" />
                </radialGradient>
              </defs>
              <rect width="1200" height="800" fill="#0d0d14" />

              {/* Grid lines */}
              {Array.from({ length: 20 }).map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 40} x2="1200" y2={i * 40} stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
              ))}
              {Array.from({ length: 30 }).map((_, i) => (
                <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="800" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
              ))}

              {/* Connection lines for route mode */}
              {routeMode && markers.slice(0, 8).map((m, i) => {
                if (i === 0) return null;
                const prev = markers[i - 1];
                const x1 = ((prev.lng + 180) / 360) * 1200;
                const y1 = ((90 - prev.lat) / 180) * 800;
                const x2 = ((m.lng + 180) / 360) * 1200;
                const y2 = ((90 - m.lat) / 180) * 800;
                return (
                  <line key={`route-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="rgba(43,159,255,0.15)" strokeWidth="2" strokeDasharray="6,4" />
                );
              })}

              {/* Customer dots */}
              {markers.map((m) => {
                const x = ((m.lng + 180) / 360) * 1200;
                const y = ((90 - m.lat) / 180) * 800;
                const isSelected = selectedCustomer?.id === m.id;
                const size = m.priority >= 4 ? 8 : m.priority >= 3 ? 6 : 4;

                return (
                  <g key={m.id} onClick={() => setSelectedCustomer(isSelected ? null : m)} style={{ cursor: "pointer" }}>
                    <circle cx={x} cy={y} r={size * 2.5} fill="rgba(43,159,255,0.06)" />
                    <circle cx={x} cy={y} r={size} fill={m.priority >= 4 ? "#f87171" : "#53bfff"}
                      stroke={isSelected ? "#fff" : "rgba(255,255,255,0.2)"}
                      strokeWidth={isSelected ? 2 : 1} />
                    {isSelected && (
                      <>
                        <rect x={x - 80} y={y - 50} width="160" height="44" rx="8" fill="#1a1a24" stroke="rgba(255,255,255,0.06)" />
                        <text x={x} y={y - 32} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">{m.name}</text>
                        <text x={x} y={y - 16} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">{m.city} • P{m.priority}</text>
                      </>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Overlay gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0d0d14] to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0d0d14] to-transparent pointer-events-none" />
          </div>
        )}

        {/* Legend */}
        {hasMarkers && (
          <div className="absolute bottom-6 left-6 glass-surface p-3 space-y-1.5 z-10">
            <p className="text-xs text-white/40 mb-1">Legende</p>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#f87171]" />
              <span className="text-xs text-white/40">Hohe Priorität</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#53bfff]" />
              <span className="text-xs text-white/40">Standard</span>
            </div>
          </div>
        )}

        {/* Info Panel */}
        {selectedCustomer && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-6 right-6 glass-panel p-4 w-64 z-10 space-y-2"
          >
            <p className="text-sm font-semibold">{selectedCustomer.name}</p>
            <p className="text-xs text-white/40 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {selectedCustomer.city}
            </p>
            <div className="flex items-center gap-2 text-xs text-white/30">
              <span className={`px-1.5 py-0.5 rounded ${
                selectedCustomer.priority >= 4 ? "bg-rose-500/10 text-rose-400" : "bg-accent-500/10 text-accent-400"
              }`}>P{selectedCustomer.priority}</span>
              <span>{selectedCustomer.lat.toFixed(4)}, {selectedCustomer.lng.toFixed(4)}</span>
            </div>
            <button className="btn-primary w-full text-xs mt-2 flex items-center justify-center gap-1.5">
              <Navigation className="w-3 h-3" /> Route planen
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
