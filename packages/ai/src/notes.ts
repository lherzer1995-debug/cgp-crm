import { openai, MODEL } from "./client";

interface PolishedNote {
  summary: string;
  cleanedText: string;
  extractedTasks: { title: string; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; dueDate?: string }[];
  followUps: string[];
  salesOpportunities: string[];
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
}

export async function polishNote(rawText: string): Promise<PolishedNote> {
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `Du bist ein Premium Executive Assistant für ein High-End CRM.
Analysiere Vertriebsnotizen und extrahiere strukturierte Daten.
Gib NUR gültiges JSON zurück, keinen anderen Text.`,
      },
      {
        role: "user",
        content: `Analysiere diese Vertriebsnotiz und extrahiere:
- summary: eine professionelle Zusammenfassung (1-2 Sätze)
- cleanedText: die bereinigte, grammatikalisch korrekte Version
- extractedTasks: Array von Tasks mit title, priority (LOW/MEDIUM/HIGH/URGENT), dueDate (YYYY-MM-DD oder null)
- followUps: Array von Follow-up-Beschreibungen
- salesOpportunities: Array von erkannten Verkaufschancen
- sentiment: POSITIVE, NEUTRAL oder NEGATIVE

Notiz: "${rawText}"

Antworte als JSON:`,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = res.choices[0]?.message?.content || "{}";
  return JSON.parse(content) as PolishedNote;
}

export async function summarizeCustomer(notes: string[], activities: string[]): Promise<string> {
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: "Du bist ein Premium CRM Analyst. Erstelle eine prägnante, professionelle Kundenzusammenfassung.",
      },
      {
        role: "user",
        content: `Erstelle eine KI-Zusammenfassung für diesen Kunden basierend auf:

Notizen:
${notes.map((n, i) => `${i + 1}. ${n}`).join("\n")}

Aktivitäten:
${activities.map((a, i) => `${i + 1}. ${a}`).join("\n")}

3-4 Sätze, professionell, auf Deutsch:`,
      },
    ],
    temperature: 0.5,
    max_tokens: 300,
  });

  return res.choices[0]?.message?.content || "Keine Zusammenfassung verfügbar.";
}
