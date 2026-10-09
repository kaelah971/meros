import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard for the Northstar tenant wipe (Oct 2026): a cleanup
 * statement once deleted live tenant rows. Fixture hygiene rules:
 *
 * 1. Deletes may only target rows the test created, keyed by tracked id/email
 *    interpolations — never by slug, name, or literal email.
 * 2. Fixture org/workspace slugs must be unique per run (template/variable,
 *    never a fixed literal) so deterministic ids can never collide with
 *    live/demo tenant rows.
 * 3. Only `organizations` (cascade-scoped by id) and `"user"` (by tracked
 *    email) may be deleted; child tables go away via FK cascade. No truncate.
 */
function testFiles(): { file: string; src: string }[] {
  const dir = join(process.cwd(), "lib", "__tests__");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".test.ts"))
    .map((file) => ({ file, src: readFileSync(join(dir, file), "utf8") }));
}

function sqlStatements(src: string, verb: "delete from" | "insert into"): string[] {
  const re = new RegExp("sql`" + verb + "[\\s\\S]*?`", "g");
  return src.match(re) ?? [];
}

function callBlocks(src: string, name: string): string[] {
  // Anchor on real call sites (name immediately followed by `(`); this
  // skips import specifiers like `import { ensureOrganization } from ...`.
  const re = new RegExp(`\\b${name}\\s*\\(`, "g");
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let j = open;
    for (; j < src.length; j++) {
      if (src[j] === "(") depth++;
      else if (src[j] === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    blocks.push(src.slice(open, j + 1));
  }
  return blocks;
}

describe("fixture hygiene (static)", () => {
  it("deletes are scoped to tracked ids/emails only", () => {
    for (const { file, src } of testFiles()) {
      expect(src, `${file}: truncate is forbidden`).not.toMatch(/truncate\s+table/i);
      for (const stmt of sqlStatements(src, "delete from")) {
        expect(stmt, `${file}: delete must have a WHERE clause: ${stmt}`).toMatch(/where/i);
        expect(
          stmt,
          `${file}: never delete by slug/name/literal email: ${stmt}`,
        ).not.toMatch(/where\s+(slug|name)\b/i);
        expect(
          stmt,
          `${file}: email predicate must use a tracked interpolation: ${stmt}`,
        ).not.toMatch(/email\s*=\s*['"]/);
        expect(
          stmt,
          `${file}: delete key must be an id/email interpolation: ${stmt}`,
        ).toMatch(/(id|email)\s*=\s*\$\{/);
        expect(
          stmt,
          `${file}: only organizations/\\"user\\" may be deleted directly (children via cascade): ${stmt}`,
        ).toMatch(/delete from\s+(organizations|"user")(?=[\s;`])/);
      }
    }
  });

  it("fixture org/workspace slugs are unique per run, never fixed literals", () => {
    for (const { file, src } of testFiles()) {
      for (const name of [
        "ensureOrganization",
        "ensureWorkspace",
        "orgFixture",
        "createWorkspaceRecord",
      ]) {
        for (const block of callBlocks(src, name)) {
          const slugLiteral =
            block.match(/slug\s*:\s*(['"])(.*?)\1/)?.[2] ??
            block.match(/\(\s*(['"])(.*?)\1/)?.[2];
          if (slugLiteral !== undefined) {
            expect(
              slugLiteral,
              `${file}: ${name} slug must be unique-per-run (got fixed "${slugLiteral}"). Use uniqueSlug().`,
            ).toMatch(/\$\{/);
          }
        }
      }
      for (const stmt of sqlStatements(src, "insert into")) {
        if (/insert into\s+(organizations|workspaces)\b/.test(stmt)) {
          expect(
            stmt,
            `${file}: fixture insert must interpolate a unique slug: ${stmt}`,
          ).toMatch(/\$\{\s*\w*[Ss]lug\w*\s*\}/);
        }
      }
    }
  });

  it("signup emails are unique per run, never fixed literals", () => {
    for (const { file, src } of testFiles()) {
      const literals = src.match(/signUpEmail\(\{[\s\S]*?\}\)/g) ?? [];
      for (const call of literals) {
        const m = call.match(/email\s*:\s*(['"])(.*?)\1/);
        if (m) {
          expect(
            m[2],
            `${file}: signup email must be unique-per-run (got fixed "${m[2]}"). Use uniqueEmail().`,
          ).toMatch(/\$\{/);
        }
      }
    }
  });
});
