const MAPS_API = "https://maps.googleapis.com/maps/api";
const key = () => process.env.GOOGLE_MAPS_API_KEY || "";

export interface LatLng { lat: number; lng: number; }

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (!key()) return null;
  const url = `${MAPS_API}/geocode/json?address=${encodeURIComponent(address)}&key=${key()}`;
  const res = await fetch(url).then(r => r.json());
  if (res.status !== "OK" || !res.results?.length) return null;
  const loc = res.results[0].geometry.location;
  return { lat: loc.lat, lng: loc.lng };
}

export async function geocodeCustomers(customers: { id: string; address?: string | null; city?: string | null }[]) {
  const results: { id: string; lat: number; lng: number }[] = [];
  for (const c of customers) {
    const addr = [c.address, c.city].filter(Boolean).join(", ");
    if (!addr) continue;
    const coords = await geocodeAddress(addr);
    if (coords) results.push({ id: c.id, ...coords });
  }
  return results;
}

export interface RouteLeg {
  customerId: string;
  distanceKm: number;
  durationMin: number;
}

export async function optimizeRoute(origin: LatLng, waypoints: { id: string; lat: number; lng: number }[]): Promise<{ polyline: string; legs: RouteLeg[]; totalKm: number; totalMin: number } | null> {
  if (!key() || waypoints.length < 2) return null;

  // Build waypoints string (max 25 including origin + destination)
  const wp = waypoints.slice(0, 23).map(w => `via:${w.lat},${w.lng}`).join("|");
  const dest = waypoints[waypoints.length - 1]!;

  const url = `${MAPS_API}/directions/json?origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&waypoints=optimize:true|${wp}&key=${key()}`;
  const res = await fetch(url).then(r => r.json());

  if (res.status !== "OK" || !res.routes?.length) return null;

  const route = res.routes[0];
  const legs: RouteLeg[] = [];
  let totalKm = 0, totalMin = 0;

  const order = res.routes[0].waypoint_order || [];
  const ordered = [waypoints[0]!, ...order.map((i: number) => waypoints[i + 1]!), waypoints[waypoints.length - 1]!];

  for (const leg of route.legs) {
    totalKm += leg.distance.value / 1000;
    totalMin += Math.ceil(leg.duration.value / 60);
  }

  return {
    polyline: route.overview_polyline?.points || "",
    legs: ordered.slice(1).map((w, i) => ({
      customerId: w.id,
      distanceKm: route.legs[i]?.distance?.value ? route.legs[i].distance.value / 1000 : 0,
      durationMin: route.legs[i]?.duration?.value ? Math.ceil(route.legs[i].duration.value / 60) : 0,
    })),
    totalKm,
    totalMin,
  };
}

export async function distanceMatrix(origins: LatLng[], destinations: LatLng[]): Promise<number[][] | null> {
  if (!key()) return null;
  const oStr = origins.map(o => `${o.lat},${o.lng}`).join("|");
  const dStr = destinations.map(d => `${d.lat},${d.lng}`).join("|");
  const url = `${MAPS_API}/distancematrix/json?origins=${oStr}&destinations=${dStr}&key=${key()}`;
  const res = await fetch(url).then(r => r.json());
  if (res.status !== "OK") return null;
  return res.rows.map((row: any) => row.elements.map((el: any) => el.status === "OK" ? el.duration.value : Infinity));
}

export function isConfigured(): boolean {
  return !!key();
}
