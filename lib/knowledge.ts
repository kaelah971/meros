import "server-only";

// P9 workspace product knowledge. Neon holds canonical source + metadata
// (titles, URLs, statuses, blob refs). Walrus holds ONLY the semantic
// retrieval index under meros:v2:workspace:<ws>:knowledge. Raw website
// text is never the sole source of truth — canonical_content lives in Neon.

export const KNOWLEDGE_TYPES = ["manual", "website", "documentation", "faq", "policy"] as const;
export type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number];

export const KNOWLEDGE_STATUSES = ["pending", "ready", "failed"] as const;

export const MAX_CHUNK_CHARS = 1200;
export const MAX_CHUNKS_PER_SOURCE = 20;
export const MAX_IMPORT_BYTES = 200_000;
export const MAX_IMPORT_PAGES = 8;
/** Canonical text cap per source: keeps Walrus indexing bounded (~20
 *  chunks max). Truncation is marked INLINE so it is never silent. */
export const MAX_CANONICAL_CHARS = 24_000;

export function capCanonical(text: string): { text: string; truncated: boolean } {
  const clean = text.trim();
  if (clean.length <= MAX_CANONICAL_CHARS) return { text: clean, truncated: false };
  return {
    text: clean.slice(0, MAX_CANONICAL_CHARS).trimEnd() + "\n\n[…content truncated at import cap; add the remainder as manual knowledge…]",
    truncated: true,
  };
}
const FETCH_TIMEOUT_MS = 15_000;

/** Split canonical text into bounded, sentence-aware chunks. Pure. */
export function chunkText(text: string, maxChars = MAX_CHUNK_CHARS): string[] {
  const clean = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.replace(/([.!?])\s+(?=[A-Z0-9"\u201c])/g, "$1\n").split("\n");
  const chunks: string[] = [];
  let current = "";
  const push = () => {
    const t = current.trim();
    if (t) chunks.push(t);
    current = "";
  };
  for (const s of sentences) {
    const piece = s.trim();
    if (!piece) continue;
    if (piece.length > maxChars) {
      // Single over-long sentence: hard-split on word boundaries.
      push();
      const words = piece.split(" ");
      let buf = "";
      for (const w of words) {
        if ((buf + " " + w).trim().length > maxChars) {
          if (buf.trim()) chunks.push(buf.trim());
          buf = w;
        } else {
          buf = buf ? buf + " " + w : w;
        }
      }
      if (buf.trim()) chunks.push(buf.trim());
      continue;
    }
    if ((current + " " + piece).trim().length > maxChars) push();
    current = current ? current + " " + piece : piece;
  }
  push();
  return chunks;
}

/** SSRF-safe public URL validation. Pure. Rejects non-http(s), localhost,
 *  private/link-local/loopback hosts, ports, and userinfo. */
export function validatePublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("not a valid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("only public http(s) pages may be imported");
  }
  if (url.username || url.password) throw new Error("URLs with credentials are rejected");
  if (url.port) throw new Error("URLs with explicit ports are rejected");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    !host.includes(".") ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".intranet") ||
    host.endsWith(".corp") ||
    host.endsWith(".home") ||
    host.endsWith(".lan")
  ) {
    throw new Error("internal hostnames are rejected");
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const octets = host.split(".").map(Number);
    const [a, b] = octets;
    const privateV4 =
      a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a >= 224;
    if (privateV4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
      throw new Error("private/link-local IP addresses are rejected");
    }
  }
  if (host.includes(":") || host === "[::1]") {
    throw new Error("IPv6 addresses are rejected");
  }
  return url;
}

/** Strip scripts/styles/nav noise to indexable text. Pure, dependency-free. */
export function htmlToText(html: string): string {
  return (
    html
      .replace(/<script[\s\S]*?<\/script\s*>/gi, " ")
      .replace(/<style[\s\S]*?<\/style\s*>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav\s*>/gi, " ")
      .replace(/<header[\s\S]*?<\/header\s*>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer\s*>/gi, " ")
      // Keep link text, drop the markup.
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .split("\n")
      .map((l) => l.replace(/[ \t]+/g, " ").trim())
      .filter((l) => l.length > 0)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** Extract same-origin http(s) links for shallow crawling. Pure. */
export function sameOriginLinks(html: string, base: URL, seen: Set<string>, limit: number): string[] {
  const out: string[] = [];
  const re = /<a\s[^>]*href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < limit) {
    let href = m[1].trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) continue;
    try {
      const u = new URL(href, base);
      if ((u.protocol === "http:" || u.protocol === "https:") && u.hostname.toLowerCase() === base.hostname.toLowerCase()) {
        u.hash = "";
        const key = u.toString();
        if (!seen.has(key)) {
          seen.add(key);
          out.push(key);
        }
      }
    } catch {
      // Ignore unparseable hrefs.
    }
  }
  return out;
}

/**
 * Shallow, same-origin crawl: seed page + up to MAX_IMPORT_PAGES-1 further
 * useful pages. Returns deduplicated extracted text per page. Throws
 * honestly on login walls/empty content so onboarding can continue with
 * manual knowledge instead.
 */
export async function importWebsite(
  seedUrl: string,
): Promise<{ pages: { url: string; text: string }[] }> {
  const seed = validatePublicUrl(seedUrl);
  const seen = new Set<string>([seed.toString()]);
  const queue: string[] = [seed.toString()];
  const pages: { url: string; text: string }[] = [];
  const seenTexts = new Set<string>();
  let bytes = 0;

  while (queue.length > 0 && pages.length < MAX_IMPORT_PAGES) {
    const url = queue.shift()!;
    let html = "";
    let text = "";
    let finalUrl = url;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          signal: ctrl.signal,
          redirect: "follow",
          headers: { "user-agent": "MerosKnowledgeBot/1.0 (+support docs import)" },
        });
        validatePublicUrl(res.url);
        const ctype = res.headers.get("content-type") ?? "";
        if (!res.ok) continue; // skip dead pages, keep going
        if (ctype && !/text\/html|application\/xhtml/i.test(ctype)) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        bytes += buf.length;
        if (bytes > MAX_IMPORT_BYTES) break;
        html = buf.toString("utf8");
        finalUrl = res.url;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      continue; // timeouts / network errors: skip page, keep going
    }
    text = htmlToText(html);
    if (text.length < 200) continue; // login walls, stubs, chrome-only pages
    const fingerprint = text.slice(0, 400).toLowerCase().replace(/\s+/g, " ");
    if (seenTexts.has(fingerprint)) continue;
    seenTexts.add(fingerprint);
    pages.push({ url: finalUrl, text });
    if (pages.length === 1) {
      // Only expand from the seed page: depth-1 crawl.
      const base = new URL(finalUrl);
      for (const link of sameOriginLinks(html, base, seen, MAX_IMPORT_PAGES)) {
        queue.push(link);
      }
    }
  }
  if (pages.length === 0) {
    throw new Error(
      "could not extract readable content (login wall, empty pages, or unsupported content). Use manual knowledge instead.",
    );
  }
  return { pages };
}
