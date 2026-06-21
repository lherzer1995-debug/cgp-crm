import { openai, MODEL } from "./client";

export interface DailyBriefing {
  briefing: string;
  topPriorities: string[];
  scheduledCount: number;
  totalCustomers: number;
  openTasks: number;
}

export async function generateDailyBriefing(stats: {
  totalCustomers: number;
  openTasks: number;
  todayAppointments: number;
  highRiskCustomers: number;
  upcomingRenewals: number;
}): Promise<DailyBriefing> {
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: "Du bist ein Premium Executive Briefing Assistant. Erstelle ein professionelles Daily Briefing. Nur JSON.",
      },
      {
        role: "user",
        content: `Erstelle ein tägliches Briefing basierend auf:
- Kunden insgesamt: ${stats.totalCustomers}
- Offene Tasks: ${stats.openTasks}
- Heutige Termine: ${stats.todayAppointments}
- Hochrisiko-Kunden: ${stats.highRiskCustomers}
- Anstehende Verlängerungen: ${stats.upcomingRenewals}

JSON: briefing (2-3 motivierende Sätze), topPriorities (Array von 3-5 Prioritäten), scheduledCount, totalCustomers, openTasks`,
      },
    ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const content = res.choices[0]?.message?.content || "{}";
  return JSON.parse(content) as DailyBriefing;
}

export interface AISearchResult {
  ids: string[];
  summary: string;
}

export async function semanticSearch(
  query: string,
  customers: { id: string; name: string; city?: string; industry?: string; notes?: string }[]
): Promise<AISearchResult> {
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: "Du bist eine semantische Suchmaschine für ein CRM. Finde relevante Kunden basierend auf der Suchanfrage. Nur JSON.",
      },
      {
        role: "user",
        content: `Suchanfrage: "${query}"

Kunden:
${customers.map((c, i) => `${i}: ${c.name} | ${c.city || ""} | ${c.industry || ""} | ${(c.notes || "").slice(0, 100)}`).join("\n")}

Gib JSON zurück mit:
- ids: Array von passenden Kunden-Indizes (nur Zahlen)
- summary: ein kurzer Satz, der das Suchergebnis beschreibt`,
      },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const content = res.choices[0]?.message?.content || "{}";
  const result = JSON.parse(content) as { ids: number[]; summary: string };
  return {
    ids: result.ids.map((i) => customers[i]?.id).filter(Boolean) as string[],
    summary: result.summary,
  };
}
