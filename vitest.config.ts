import { defineConfig } from "vitest/config";

// Test-only: stub `server-only` (which throws on plain import) so tests can
// import server modules like lib/db and lib/auth-store against live Neon.
export default defineConfig({
  resolve: {
    alias: {
      "server-only": new URL("./lib/__tests__/server-only-stub.ts", import.meta.url).pathname,
    },
  },
  test: {
    pool: "forks",
    maxWorkers: 1,
    globalSetup: ["./lib/__tests__/setup-env.ts"],
  },
});
