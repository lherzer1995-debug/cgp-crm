/**
 * Mobile action helpers for 1-tap phone, email, and maps navigation.
 */

/** Opens the native phone dialer with the given number */
export function openPhone(phone: string): void {
  const cleaned = phone.replace(/\s/g, "");
  window.location.href = `tel:${cleaned}`;
}

/** Opens the native email client with the given address */
export function openEmail(email: string, subject?: string): void {
  const subjectParam = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  window.location.href = `mailto:${email}${subjectParam}`;
}

/** Opens Google Maps with the given address for navigation */
export function openMaps(address: string, city?: string | null, country?: string | null): void {
  const parts = [address, city, country].filter(Boolean).join(", ");
  const encoded = encodeURIComponent(parts);
  // Use Google Maps URL scheme — works on mobile (opens app) and desktop (opens browser)
  window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, "_blank");
}

/** Builds a full address string from customer fields */
export function buildAddress(city?: string | null, country?: string | null): string {
  return [city, country].filter(Boolean).join(", ");
}
