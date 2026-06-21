import { openai, MODEL } from "./client";

export interface ChurnPrediction {
  churnProbability: number;
  reasons: string[];
  risk: "low" | "medium" | "high";
  retentionActions: string[];
}

export async function predictChurn(
  customer: { name: string; status: string; contractEnd?: string; lastActivity?: string; notes: string[] }
): Promise<ChurnPrediction> {
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: "Du bist ein Churn-Prediction-Spezialist. Analysiere Kundendaten und berechne die Abwanderungswahrscheinlichkeit. Antworte NUR als JSON.",
      },
      {
        role: "user",
        content: `Analysiere diesen Kunden auf Churn-Risiko:
- Name: ${customer.name}
- Status: ${customer.status}
- Vertragsende: ${customer.contractEnd || "unbekannt"}
- Letzte Aktivität: ${customer.lastActivity || "unbekannt"}
- Notizen: ${customer.notes.join("; ")}

Gib JSON zurück mit:
- churnProbability: 0-100 Zahl
- reasons: Array von Gründen
- risk: "low" | "medium" | "high"
- retentionActions: Array von empfohlenen Maßnahmen`,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = res.choices[0]?.message?.content || "{}";
  return JSON.parse(content) as ChurnPrediction;
}

export interface SuggestedAction {
  action: string;
  reason: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}

export async function suggestNextAction(
  customer: { name: string; status: string; lastContact?: string; recentNotes: string[] }
): Promise<SuggestedAction> {
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: "Du bist ein strategischer Sales Advisor. Empfiehl die optimale nächste Aktion für einen Kunden. Nur JSON.",
      },
      {
        role: "user",
        content: `Empfiehl die beste nächste Aktion:
- Kunde: ${customer.name}
- Status: ${customer.status}
- Letzter Kontakt: ${customer.lastContact || "unbekannt"}
- Aktuelle Notizen: ${customer.recentNotes.join("; ")}

JSON: action, reason, priority (LOW/MEDIUM/HIGH/URGENT)`,
      },
    ],
    temperature: 0.4,
    response_format: { type: "json_object" },
  });

  const content = res.choices[0]?.message?.content || "{}";
  return JSON.parse(content) as SuggestedAction;
}
