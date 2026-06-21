import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.deepseek.com/v1",
});

const MODEL = process.env.AI_MODEL || "deepseek-chat";

export { openai, MODEL };
