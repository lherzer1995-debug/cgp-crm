/**
 * Geocoding utilities using Nominatim (OpenStreetMap, free, no API key needed).
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

// Simple in-memory cache to avoid repeated requests
const geocodeCache = new Map<string, Coordinates | null>();

/**
 * Converts an address to lat/lng using Nominatim.
 * Returns null if geocoding fails.
 */
export async function geocodeAddress(
  city?: string | null,
  country?: string | null,
): Promise<Coordinates | null> {
  const query = [city, country].filter(Boolean).join(", ");
  if (!query) return null;

  if (geocodeCache.has(query)) {
    return geocodeCache.get(query) ?? null;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "CGP-CRM/1.0" },
    });
    if (!res.ok) {
      geocodeCache.set(query, null);
      return null;
    }
    const data = await res.json() as { lat: string; lon: string }[];
    if (!data.length) {
      geocodeCache.set(query, null);
      return null;
    }
    const coords: Coordinates = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
    geocodeCache.set(query, coords);
    return coords;
  } catch {
    geocodeCache.set(query, null);
    return null;
  }
}
