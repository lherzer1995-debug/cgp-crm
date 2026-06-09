import { storage } from "./storage";
import type { InsertActivity } from "@shared/schema";

/**
 * Calls OpenAI chat completions with a simple prompt.
 * Returns the assistant message text or throws on error.
 */
export async function callOpenAI(prompt: string, maxTokens = 300): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ist nicht konfiguriert. Bitte in den Umgebungsvariablen setzen.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API Fehler (${response.status}): ${err}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Loads all notes and activities for a customer, formats them as text,
 * and asks OpenAI to produce a 3-sentence German summary.
 */
export async function summarizeCustomerNotes(customerId: number): Promise<string> {
  const notes = storage.getNotes(customerId);
  const activities = storage.getActivities(customerId);

  if (notes.length === 0 && activities.length === 0) {
    throw new Error("Keine Notizen oder Aktivitäten für diesen Kunden vorhanden.");
  }

  // Build a text block from notes and activities
  const parts: string[] = [];

  // Sort notes by date descending
  const sortedNotes = [...notes].sort(
    (a, b) => (b.createdAt > a.createdAt ? 1 : -1)
  );
  for (const note of sortedNotes.slice(0, 10)) {
    const date = new Date(note.createdAt).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    // Strip HTML tags from content
    const text = note.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    parts.push(`Notiz (${date}) – ${note.title}: ${text}`);
  }

  // Sort activities by date descending
  const sortedActs = [...activities].sort(
    (a, b) => ((b.dueDate ?? b.createdAt ?? "") > (a.dueDate ?? a.createdAt ?? "") ? 1 : -1)
  );
  for (const act of sortedActs.slice(0, 10)) {
    const date = act.dueDate
      ? new Date(act.dueDate).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
      : new Date(act.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    const status = act.done ? "erledigt" : "offen";
    parts.push(`Aktivität (${date}, ${status}) – ${act.description}`);
  }

  const context = parts.join("\n");

  const prompt = `Fasse folgende Notizen und Aktivitäten eines Kunden in 3 Sätzen auf Deutsch zusammen.
Format: "Letztes Gespräch [Datum] – [Thema]. [Offen/Status]. [Nächste Schritte]."
Sei präzise und geschäftlich. Verwende keine Aufzählungszeichen.

${context}`;

  return callOpenAI(prompt, 300);
}

/**
 * Generates a professional visit report from free-text notes.
 */
export async function generateVisitReport(customerId: number, visitNotes: string): Promise<string> {
  const customer = storage.getCustomer(customerId);
  const companyName = customer?.companyName ?? "Kunde";
  const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  const prompt = `Erstelle einen professionellen Besuchsbericht für das Unternehmen "${companyName}" basierend auf diesen Notizen:

${visitNotes}

Format (strikt einhalten):
Besuchsdatum: ${today}
Unternehmen: ${companyName}

Themen:
- [Thema 1]
- [Thema 2]

Ergebnisse:
- [Ergebnis 1]
- [Ergebnis 2]

Nächste Schritte:
- [Schritt 1]
- [Schritt 2]

Sei präzise und professionell. Verwende Deutsch.`;

  return callOpenAI(prompt, 600);
}

/**
 * Extracts todos from a visit report and creates activities.
 */
export async function extractTodosFromReport(customerId: number, report: string): Promise<InsertActivity[]> {
  const prompt = `Extrahiere alle "Nächste Schritte" aus diesem Besuchsbericht als JSON-Array.
Gib NUR ein JSON-Array zurück, keine anderen Texte.
Format: [{"description": "Aufgabenbeschreibung", "type": "follow_up", "priority": "medium"}]
Mögliche Typen: call, follow_up, meeting, email
Mögliche Prioritäten: low, medium, high

Bericht:
${report}`;

  const raw = await callOpenAI(prompt, 400);

  let todos: { description: string; type: string; priority: string }[] = [];
  try {
    // Extract JSON array from response
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      todos = JSON.parse(match[0]);
    }
  } catch {
    // Fallback: parse "Nächste Schritte" section line by line
    const nextStepsSection = report.split(/Nächste Schritte:/i)[1] ?? "";
    const steps = nextStepsSection.split("\n").filter((l) => l.trim().startsWith("-")).map((l) => l.replace(/^-\s*/, "").trim()).filter(Boolean);
    todos = steps.map((s) => ({ description: s, type: "follow_up", priority: "medium" }));
  }

  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const created: InsertActivity[] = [];

  for (const todo of todos.slice(0, 10)) {
    if (!todo.description?.trim()) continue;
    const activity = storage.createActivity({
      customerId,
      type: (todo.type as any) || "follow_up",
      description: todo.description.trim(),
      priority: (todo.priority as any) || "medium",
      dueDate,
      dueTime: null,
      rawDateText: null,
      calendarEventId: null,
      done: false,
      completedAt: null,
      repeatDate: null,
    });
    created.push(activity as any);
  }

  return created;
}

// ── Haversine distance (km) ────────────────────────────────────────────────
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
}

/**
 * Nearest-Neighbor route optimization.
 * customerCoords: [{customerId, lat, lng, companyName, city}]
 * startLat/startLng: starting position
 */
export function optimizeRoute(
  customerCoords: { customerId: number; lat: number; lng: number; companyName: string; city: string | null }[],
  startLat: number,
  startLng: number
): OptimizedRoute {
  if (customerCoords.length === 0) {
    return { stops: [], totalDistanceKm: 0, totalEstimatedMinutes: 0, optimizedOrder: [] };
  }

  const unvisited = [...customerCoords];
  const visited: typeof customerCoords = [];
  let curLat = startLat;
  let curLng = startLng;

  while (unvisited.length > 0) {
    let minDist = Infinity;
    let minIdx = 0;
    for (let i = 0; i < unvisited.length; i++) {
      const d = haversineDistance(curLat, curLng, unvisited[i].lat, unvisited[i].lng);
      if (d < minDist) { minDist = d; minIdx = i; }
    }
    const next = unvisited.splice(minIdx, 1)[0];
    visited.push(next);
    curLat = next.lat;
    curLng = next.lng;
  }

  // Build stops with distances
  let prevLat = startLat;
  let prevLng = startLng;
  let totalDistanceKm = 0;
  let totalEstimatedMinutes = 0;

  const stops: RouteStop[] = visited.map((c) => {
    const dist = haversineDistance(prevLat, prevLng, c.lat, c.lng);
    // Average speed 50 km/h in city/mixed traffic
    const travelMin = Math.round((dist / 50) * 60);
    prevLat = c.lat;
    prevLng = c.lng;
    totalDistanceKm += dist;
    totalEstimatedMinutes += travelMin;
    return {
      customerId: c.customerId,
      companyName: c.companyName,
      city: c.city,
      lat: c.lat,
      lng: c.lng,
      distanceFromPrevKm: Math.round(dist * 10) / 10,
      estimatedTravelMinutes: travelMin,
    };
  });

  return {
    stops,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalEstimatedMinutes,
    optimizedOrder: visited.map((c) => c.customerId),
  };
}

// ── Risk Scoring ───────────────────────────────────────────────────────────

export interface RiskFactor {
  label: string;
  score: number;
  weight: number;
}

export interface RiskAssessment {
  customerId: number;
  score: number;
  category: "green" | "yellow" | "red";
  factors: RiskFactor[];
  reasons: string[];
}

export function calculateRiskScore(customerId: number): RiskAssessment {
  const customer = storage.getCustomer(customerId);
  if (!customer) throw new Error("Kunde nicht gefunden");

  const activities = storage.getActivities(customerId);
  const commissions = storage.getCommissions({ customerId });
  const tickets = storage.getSupportTickets(customerId);

  const today = new Date();
  const factors: RiskFactor[] = [];
  const reasons: string[] = [];

  // Factor 1: Days since last activity (weight 30)
  let daysSinceActivity = 999;
  if (customer.lastActivityDate) {
    daysSinceActivity = Math.floor(
      (today.getTime() - new Date(customer.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
    );
  } else if (activities.length > 0) {
    const lastAct = activities.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))[0];
    daysSinceActivity = Math.floor(
      (today.getTime() - new Date(lastAct.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
  }
  const activityScore = daysSinceActivity > 90 ? 100 : daysSinceActivity > 60 ? 70 : daysSinceActivity > 30 ? 30 : 0;
  factors.push({ label: "Letzte Aktivität", score: activityScore, weight: 30 });
  if (daysSinceActivity > 60) {
    reasons.push(`Keine Aktivität seit ${daysSinceActivity} Tagen`);
  }

  // Factor 2: Contract expiry (weight 25)
  let contractScore = 0;
  if (customer.contractEnd) {
    const daysToExpiry = Math.floor(
      (new Date(customer.contractEnd).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysToExpiry < 0) { contractScore = 100; reasons.push("Vertrag bereits abgelaufen"); }
    else if (daysToExpiry < 30) { contractScore = 90; reasons.push(`Vertrag läuft in ${daysToExpiry} Tagen aus`); }
    else if (daysToExpiry < 60) { contractScore = 60; reasons.push(`Vertrag läuft in ${daysToExpiry} Tagen aus`); }
    else if (daysToExpiry < 90) { contractScore = 30; }
  }
  factors.push({ label: "Vertragsende", score: contractScore, weight: 25 });

  // Factor 3: No commissions in last 3 months (weight 25)
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const recentCommissions = commissions.filter(
    (c) => new Date(c.date) >= threeMonthsAgo
  );
  const commissionScore = recentCommissions.length === 0 ? (commissions.length > 0 ? 80 : 40) : 0;
  factors.push({ label: "Provisionen (3 Monate)", score: commissionScore, weight: 25 });
  if (commissionScore > 0 && commissions.length > 0) {
    reasons.push("Keine Provisionen in den letzten 3 Monaten");
  }

  // Factor 4: Open/high-priority support tickets (weight 10)
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress");
  const highPrioTickets = openTickets.filter((t) => t.priority === "high");
  const ticketScore = highPrioTickets.length > 0 ? 80 : openTickets.length > 2 ? 50 : openTickets.length > 0 ? 20 : 0;
  factors.push({ label: "Support-Tickets", score: ticketScore, weight: 10 });
  if (highPrioTickets.length > 0) {
    reasons.push(`${highPrioTickets.length} offene Hochpriorität-Tickets`);
  }

  // Factor 5: Commission trend (weight 10)
  let trendScore = 0;
  if (commissions.length >= 3) {
    const sorted = [...commissions].sort((a, b) => (a.date > b.date ? 1 : -1));
    const recent3 = sorted.slice(-3).map((c) => c.amount);
    const older3 = sorted.slice(-6, -3).map((c) => c.amount);
    if (older3.length >= 2) {
      const recentAvg = recent3.reduce((s, v) => s + v, 0) / recent3.length;
      const olderAvg = older3.reduce((s, v) => s + v, 0) / older3.length;
      if (olderAvg > 0 && recentAvg < olderAvg * 0.7) {
        trendScore = 70;
        reasons.push("Provisionen sinken (Trend -30%)");
      } else if (olderAvg > 0 && recentAvg < olderAvg * 0.9) {
        trendScore = 30;
      }
    }
  }
  factors.push({ label: "Provisions-Trend", score: trendScore, weight: 10 });

  // Weighted sum
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const weightedScore = factors.reduce((s, f) => s + (f.score * f.weight) / totalWeight, 0);
  const score = Math.round(Math.min(100, Math.max(0, weightedScore)));

  const category: "green" | "yellow" | "red" =
    score >= 61 ? "red" : score >= 31 ? "yellow" : "green";

  return { customerId, score, category, factors, reasons };
}

// ── Daily Briefing ─────────────────────────────────────────────────────────

export async function generateDailyBriefing(): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const allActivities = storage.getAllActivities();
  const allCustomers = storage.getCustomers();
  const allCommissions = storage.getCommissions();
  const customerMap = new Map(allCustomers.map((c) => [c.id, c]));

  const overdue = allActivities.filter((a) => !a.done && a.dueDate && a.dueDate < today);
  const todayTasks = allActivities.filter((a) => !a.done && a.dueDate === today);
  const commissionsToday = allCommissions.filter((c) => c.date === today);

  // Risk customers (score >= 61)
  const riskCustomers = allCustomers
    .filter((c) => c.riskScore != null && c.riskScore >= 61)
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 5);

  // Contracts expiring soon
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  const expiringContracts = allCustomers.filter((c) => {
    if (!c.contractEnd) return false;
    const end = new Date(c.contractEnd);
    return end >= new Date(today) && end <= soon;
  });

  const prompt = `Du bist ein professioneller CRM-Assistent für einen Vertriebsmitarbeiter bei Commerz Globalpay.
Erstelle ein prägnantes Tages-Briefing auf Deutsch für heute (${new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}).

DATEN:
Überfällige Aufgaben (${overdue.length}):
${overdue.slice(0, 5).map((a) => `- ${customerMap.get(a.customerId)?.companyName ?? "Unbekannt"}: ${a.description} (fällig: ${a.dueDate})`).join("\n") || "Keine"}

Heute fällige Aufgaben (${todayTasks.length}):
${todayTasks.slice(0, 5).map((a) => `- ${customerMap.get(a.customerId)?.companyName ?? "Unbekannt"}: ${a.description}`).join("\n") || "Keine"}

Risiko-Kunden (${riskCustomers.length}):
${riskCustomers.map((c) => `- ${c.companyName} (Score: ${c.riskScore})`).join("\n") || "Keine"}

Verträge die bald auslaufen (${expiringContracts.length}):
${expiringContracts.slice(0, 3).map((c) => `- ${c.companyName}: ${c.contractEnd}`).join("\n") || "Keine"}

Provisionen heute: ${commissionsToday.reduce((s, c) => s + c.amount, 0).toFixed(2)} €

FORMAT:
## Guten Morgen! Hier ist dein Tages-Briefing

**Prioritäten heute:**
[3-5 konkrete Handlungsempfehlungen]

**Risiken im Blick:**
[Wichtigste Risiken kurz]

**Chancen:**
[Upsell/Verlängerungs-Chancen]

Sei präzise, motivierend und geschäftlich. Max. 300 Wörter.`;

  return callOpenAI(prompt, 600);
}

// ── Weekly Summary ─────────────────────────────────────────────────────────

export async function generateWeeklySummary(): Promise<string> {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  const allActivities = storage.getAllActivities();
  const allCommissions = storage.getCommissions();
  const allCustomers = storage.getCustomers();

  const weekActivities = allActivities.filter(
    (a) => (a.createdAt ?? "") >= weekAgoStr && (a.createdAt ?? "") <= todayStr + "T23:59:59"
  );
  const weekCommissions = allCommissions.filter(
    (c) => c.date >= weekAgoStr && c.date <= todayStr
  );
  const completedThisWeek = weekActivities.filter((a) => a.done).length;
  const totalCommissionsWeek = weekCommissions.reduce((s, c) => s + c.amount, 0);

  const prompt = `Erstelle eine wöchentliche Zusammenfassung für einen Vertriebsmitarbeiter bei Commerz Globalpay.

WOCHENDATEN (${weekAgoStr} bis ${todayStr}):
- Aktivitäten diese Woche: ${weekActivities.length} (${completedThisWeek} erledigt)
- Provisionen diese Woche: ${totalCommissionsWeek.toFixed(2)} €
- Neue Kunden: ${allCustomers.filter((c) => c.createdAt >= weekAgoStr).length}
- Offene Aufgaben gesamt: ${allActivities.filter((a) => !a.done).length}

FORMAT:
## Wochenzusammenfassung

**Was lief gut:**
[Erfolge der Woche]

**Was braucht Aufmerksamkeit:**
[Offene Punkte]

**Nächste Woche:**
[Top 3 Prioritäten]

Sei präzise und konstruktiv. Max. 200 Wörter.`;

  return callOpenAI(prompt, 500);
}

// ── Monthly Forecast ───────────────────────────────────────────────────────

export interface MonthlyForecast {
  expectedCommissions: number;
  churnRiskCount: number;
  upsellOpportunities: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
  commissionHistory: { month: string; total: number }[];
  recommendations: string[];
  forecastText: string;
}

export async function generateMonthlyForecast(): Promise<MonthlyForecast> {
  const today = new Date();
  const allCustomers = storage.getCustomers();
  const allCommissions = storage.getCommissions();

  // Last 6 months commission data
  const commissionHistory: { month: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
    const total = allCommissions
      .filter((c) => c.date.startsWith(key))
      .reduce((s, c) => s + c.amount, 0);
    commissionHistory.push({ month: label, total });
  }

  // Trend: compare last 3 months vs previous 3 months
  const last3 = commissionHistory.slice(-3).reduce((s, m) => s + m.total, 0);
  const prev3 = commissionHistory.slice(-6, -3).reduce((s, m) => s + m.total, 0);
  const trendPercent = prev3 > 0 ? Math.round(((last3 - prev3) / prev3) * 100) : 0;
  const trend: "up" | "down" | "stable" =
    trendPercent > 5 ? "up" : trendPercent < -5 ? "down" : "stable";

  // Expected next month (simple linear extrapolation)
  const avgLast3 = last3 / 3;
  const expectedCommissions = Math.round(avgLast3 * (1 + trendPercent / 200));

  // Churn risk: contracts expiring in next 30 days
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);
  const todayStr = today.toISOString().split("T")[0];
  const in30Str = in30Days.toISOString().split("T")[0];
  const churnRiskCount = allCustomers.filter(
    (c) => c.contractEnd && c.contractEnd >= todayStr && c.contractEnd <= in30Str
  ).length;

  // Upsell opportunities: customers with no activity in 60+ days but have commissions
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyStr = sixtyDaysAgo.toISOString().split("T")[0];
  const upsellOpportunities = allCustomers.filter((c) => {
    const hasCommissions = allCommissions.some((cm) => cm.customerId === c.id);
    const inactive = !c.lastActivityDate || c.lastActivityDate < sixtyStr;
    return hasCommissions && inactive;
  }).length;

  // AI recommendations
  const prompt = `Du bist ein Vertriebsanalyst. Erstelle 3-5 konkrete Empfehlungen für nächsten Monat.

DATEN:
- Provisions-Trend: ${trendPercent > 0 ? "+" : ""}${trendPercent}% (${trend === "up" ? "steigend" : trend === "down" ? "fallend" : "stabil"})
- Erwartete Provisionen nächsten Monat: ${expectedCommissions.toFixed(2)} €
- Verträge die in 30 Tagen auslaufen: ${churnRiskCount}
- Upsell-Chancen (inaktive Kunden mit Provisionshistorie): ${upsellOpportunities}
- Kunden gesamt: ${allCustomers.length}

Gib NUR ein JSON-Array mit Strings zurück: ["Empfehlung 1", "Empfehlung 2", ...]
Max. 5 Empfehlungen, je max. 15 Wörter, auf Deutsch.`;

  let recommendations: string[] = [];
  try {
    const raw = await callOpenAI(prompt, 300);
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) recommendations = JSON.parse(match[0]);
  } catch {
    recommendations = [
      "Risiko-Kunden kontaktieren und Vertragsverlängerung besprechen",
      "Upsell-Chancen bei inaktiven Kunden nutzen",
      "Provisions-Trend durch neue Abschlüsse verbessern",
    ];
  }

  const forecastText = `Prognose für ${new Date(today.getFullYear(), today.getMonth() + 1, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}: Erwartete Provisionen ${expectedCommissions.toFixed(2)} €, Trend ${trendPercent > 0 ? "+" : ""}${trendPercent}%.`;

  return {
    expectedCommissions,
    churnRiskCount,
    upsellOpportunities,
    trend,
    trendPercent,
    commissionHistory,
    recommendations,
    forecastText,
  };
}
