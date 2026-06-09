/**
 * Geocoding utilities using Nominatim (OpenStreetMap, free, no API key needed).
 * Coordinates are cached in localStorage to avoid repeated requests.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

const CACHE_KEY = "cgp_geocode_cache";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  coords: Coordinates | null;
  ts: number;
}

// In-memory cache for the current session
const memCache = new Map<string, Coordinates | null>();

function loadFromStorage(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CacheEntry>) : {};
  } catch {
    return {};
  }
}

function saveToStorage(store: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota errors
  }
}

function getFromStorage(query: string): Coordinates | null | undefined {
  const store = loadFromStorage();
  const entry = store[query];
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL_MS) return undefined; // expired
  return entry.coords;
}

function setInStorage(query: string, coords: Coordinates | null) {
  const store = loadFromStorage();
  store[query] = { coords, ts: Date.now() };
  saveToStorage(store);
}

/**
 * Converts an address to lat/lng using Nominatim.
 * Returns null if geocoding fails.
 * Caches results in both memory and localStorage.
 */
export async function geocodeAddress(
  city?: string | null,
  country?: string | null,
): Promise<Coordinates | null> {
  const query = [city, country].filter(Boolean).join(", ");
  if (!query) return null;

  // 1. Memory cache
  if (memCache.has(query)) {
    return memCache.get(query) ?? null;
  }

  // 2. localStorage cache
  const stored = getFromStorage(query);
  if (stored !== undefined) {
    memCache.set(query, stored);
    return stored;
  }

  // 3. Fetch from Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "CGP-CRM/1.0" },
    });
    if (!res.ok) {
      memCache.set(query, null);
      setInStorage(query, null);
      return null;
    }
    const data = await res.json() as { lat: string; lon: string }[];
    if (!data.length) {
      memCache.set(query, null);
      setInStorage(query, null);
      return null;
    }
    const coords: Coordinates = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
    memCache.set(query, coords);
    setInStorage(query, coords);
    return coords;
  } catch {
    memCache.set(query, null);
    setInStorage(query, null);
    return null;
  }
}

/**
 * Calculates the distance in km between two coordinates (Haversine formula).
 */
export function haversineDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng *
      sinLng;
  return R * 2 * Math.asin(Math.sqrt(h));
}
