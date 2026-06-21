import OpenAI from "openai";

let client: OpenAI | null = null;

export function ai(): OpenAI | null {
  if (client) return client;
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  client = new OpenAI({
    apiKey: key,
    baseURL: process.env.OPENAI_BASE_URL || "https://api.deepseek.com/v1",
  });
  return client;
}

export const MODEL = process.env.AI_MODEL || "deepseek-chat";

export async function aiChat(
  system: string,
  user: string,
  maxTokens = 500,
): Promise<string> {
  const c = ai();
  if (!c) return "AI nicht verfügbar. Bitte API-Key konfigurieren.";
  const r = await c.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature: 0.3,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return r.choices[0]?.message?.content || "";
}
