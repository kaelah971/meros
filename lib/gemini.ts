import "server-only";
import { isGeminiConfigured } from "./env";

// P0 scaffold only. No chat loop, no extraction — memory is proven
// independently of model behavior first.

export function geminiStatus(): { configured: boolean; model: string } {
  return { configured: isGeminiConfigured(), model: "gemini-2.0-flash" };
}

export async function getGeminiClient(): Promise<unknown> {
  if (!isGeminiConfigured())
    throw new Error("GEMINI_API_KEY is not configured (scaffold only in P0)");
  const { GoogleGenAI } = await import("@google/genai");
  const key = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim()!;
  return new GoogleGenAI({ apiKey: key });
}
