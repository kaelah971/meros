/**
 * Shared fixture hygiene for live-Neon tests.
 *
 * RULES (enforced by test-hygiene.test.ts — read them before adding fixtures):
 * 1. Every org/workspace slug created by a test MUST be unique to that run.
 *    Use uniqueSlug()/uniqueEmail() — never a fixed literal like "gate-ws".
 *    Deterministic id derivation (sha of slug) then guarantees the ids are
 *    unique too, so cleanup can never collide with live/demo tenant rows.
 * 2. Cleanup MUST delete only rows the test itself created, keyed by those
 *    tracked ids/emails. Never delete by slug, name, or broad email match,
 *    and never touch shared owner/demo accounts.
 */
let counter = 0;

function runTag(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}`;
}

/** Unique-per-run slug, e.g. `gate-ws-lxyz-1`. Safe for deterministic id derivation. */
export function uniqueSlug(prefix: string): string {
  return `${prefix}-${runTag()}`;
}

/** Unique-per-run signup email. Always under example.test, never a real address. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${runTag()}@example.test`;
}

function dbKey(): Promise<string> {
  return import("node:fs").then(({ readFileSync }) =>
    readFileSync(".env.local", "utf8")
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("DATABASE_URL="))!
      .slice("DATABASE_URL=".length),
  );
}

/**
 * Per-file tracker: record every org id / auth email the test creates, then
 * cleanup() deletes exactly those rows (org delete cascades to that org's
 * workspaces, customers, conversations, messages, and knowledge — scoped by
 * id, so sibling tenant data is untouched).
 */
export class FixtureTracker {
  private orgIds: string[] = [];
  private emails: string[] = [];

  trackOrg(id: string): string {
    this.orgIds.push(id);
    return id;
  }

  trackEmail(email: string): string {
    this.emails.push(email);
    return email;
  }

  async cleanup(): Promise<void> {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(await dbKey());
    for (const id of this.orgIds) {
      await sql`delete from organizations where id = ${id}`;
    }
    for (const email of this.emails) {
      await sql`delete from "user" where email = ${email}`;
    }
  }
}
