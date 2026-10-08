import { readFileSync } from "node:fs";

// Runs before any test module is imported: loads .env.local so modules that
// read env at import time (pg Pool, Better Auth) see real values. Test-only;
// values are never logged.
export default function setup() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const i = line.indexOf("=");
      if (i > 0) {
        const k = line.slice(0, i).trim();
        if (k && !(k in process.env)) process.env[k] = line.slice(i + 1).trim();
      }
    }
  } catch {
    // No .env.local: DB-backed tests will fail honestly via dbAvailable().
  }
}
