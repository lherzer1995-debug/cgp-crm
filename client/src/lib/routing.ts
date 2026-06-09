/**
 * Routing utilities for distance calculation and Google Maps route planning.
 */

import type { Coordinates } from "./geocoding";

/**
 * Calculates the distance between two coordinates using the Haversine formula.
 * Returns distance in kilometers.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export interface CustomerWithDistance {
  id: number;
  companyName: string;
  city?: string | null;
  country?: string | null;
  coords?: Coordinates;
  distanceKm?: number;
}

/**
 * Filters customers by radius from a center point.
 */
export function filterByRadius(
  customers: CustomerWithDistance[],
  centerLat: number,
  centerLng: number,
  radiusKm: number,
): CustomerWithDistance[] {
  return customers
    .filter((c) => {
      if (!c.coords) return false;
      const dist = calculateDistance(centerLat, centerLng, c.coords.lat, c.coords.lng);
      c.distanceKm = dist;
      return dist <= radiusKm;
    })
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}

/**
 * Opens Google Maps with a multi-stop route.
 * waypoints: array of address strings
 */
export function openGoogleMapsRoute(waypoints: string[]): void {
  if (waypoints.length === 0) return;
  if (waypoints.length === 1) {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(waypoints[0])}`,
      "_blank",
    );
    return;
  }
  const origin = encodeURIComponent(waypoints[0]);
  const destination = encodeURIComponent(waypoints[waypoints.length - 1]);
  const middle = waypoints.slice(1, -1).map(encodeURIComponent).join("|");
  const waypointsParam = middle ? `&waypoints=${middle}` : "";
  window.open(
    `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsParam}`,
    "_blank",
  );
}
