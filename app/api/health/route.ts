import { NextResponse } from "next/server";
import { getMemwalServerUrl, isMainnetRelayer, isNeonConfigured } from "@/lib/env";
import { geminiStatus } from "@/lib/gemini";
import { isWalrusConfigured } from "@/lib/env";

export async function GET() {
  const serverUrl = getMemwalServerUrl();
  return NextResponse.json({
    ok: true,
    slice: "p0-memory-spine",
    walrus: {
      configured: isWalrusConfigured(),
      serverUrl,
      mainnet: isMainnetRelayer(serverUrl),
    },
    neon: { configured: isNeonConfigured() },
    gemini: geminiStatus(),
  });
}
