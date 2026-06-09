import { storage } from "./storage";

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
