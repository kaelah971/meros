import { NextResponse } from "next/server";
import { seedDemoTenants } from "@/lib/tenant-store";

/**
 * DEV-ONLY idempotent seed for Acme + Nova organization/workspace RECORDS.
 * Refuses production outright. Creates zero Walrus memories.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "seed is disabled in production" },
      { status: 403 },
    );
  }
  const result = await seedDemoTenants();
  if (!result.ok) {
    return NextResponse.json(result, { status: 503 });
  }
  return NextResponse.json(result);
}
