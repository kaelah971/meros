import "server-only";
import { GoogleGenAI } from "@google/genai";
import { isGeminiConfigured } from "./env";

// Primary model: current Gemini Flash-class. Single provider (no OpenAI/Anthropic).
export const GEMINI_MODEL = "gemini-3.8-flash";

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super(
      "GEMINI_API_KEY is not configured on the server. Add it to .env.local to enable chat.",
    );
    this.name = "GeminiNotConfiguredError";
  }
}

export function geminiStatus(): { configured: boolean; model: string } {
  return { configured: isGeminiConfigured(), model: GEMINI_MODEL };
}

export type ChatTurn = { role: "user" | "assistant"; text: string };

function getKey(): string {
  const key =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  if (!key) throw new GeminiNotConfiguredError();
  return key;
}

/** Server-side model call. Throws honestly on missing key or empty answer. */
export async function generateSupportAnswer(input: {
  systemInstruction: string;
  history: ChatTurn[];
  message: string;
}): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getKey() });
  const contents = [
    ...input.history.map((h) => ({
      role: h.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: h.text }],
    })),
    { role: "user" as const, parts: [{ text: input.message }] },
  ];
  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: { systemInstruction: input.systemInstruction },
  });
  const text = res.text?.trim();
  if (!text) throw new Error("Gemini returned an empty answer");
  return text;
}
