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
