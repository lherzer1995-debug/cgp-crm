/**
 * Client-side route optimization utilities.
 * The heavy lifting (geocoding + nearest-neighbor) is done server-side.
 * These helpers are for display/formatting on the client.
 */

export interface RouteStop {
  customerId: number;
  companyName: string;
  city: string | null;
  lat: number;
  lng: number;
  distanceFromPrevKm: number;
  estimatedTravelMinutes: number;
}

export interface OptimizedRoute {
  stops: RouteStop[];
  totalDistanceKm: number;
  totalEstimatedMinutes: number;
  optimizedOrder: number[];
  startLocation: string;
  routeDate: string;
}

/**
 * Formats minutes as "Xh Ym" or "Ym".
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} Min.`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/**
 * Formats distance as "X,X km".
 */
export function formatDistance(km: number): string {
  return `${km.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

/**
 * Builds a Google Maps URL with waypoints for the optimized route.
 */
export function buildGoogleMapsUrl(startLocation: string, stops: RouteStop[]): string {
  if (stops.length === 0) return "";
  const origin = encodeURIComponent(startLocation);
  const destination = encodeURIComponent(stops[stops.length - 1].city ?? stops[stops.length - 1].companyName);
  const waypoints = stops
    .slice(0, -1)
    .map((s) => encodeURIComponent(s.city ?? s.companyName))
    .join("|");
  const base = "https://www.google.com/maps/dir/";
  return `${base}?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ""}&travelmode=driving`;
}

/**
 * Estimates total travel time for a given distance (50 km/h average).
 */
export function estimateTravelTime(distanceKm: number): number {
  return Math.round((distanceKm / 50) * 60);
}
