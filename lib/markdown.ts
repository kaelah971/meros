// Minimal safe Markdown tokenizer for assistant answers.
// Produces a plain AST; the React renderer lives in app/chat/page.tsx.
// React escapes all text by default, so raw HTML in the source can never
// execute — it renders as literal text.

export type InlineNode =
  | { t: "text"; v: string }
  | { t: "bold"; v: string }
  | { t: "italic"; v: string }
  | { t: "code"; v: string };

export type BlockNode =
  | { t: "heading"; level: 1 | 2 | 3; inline: InlineNode[] }
  | { t: "para"; inline: InlineNode[] }
  | { t: "ul"; items: InlineNode[][] }
  | { t: "ol"; items: InlineNode[][] };

/** Split text on `code` spans first so formatting inside code is literal. */
export function parseInline(src: string): InlineNode[] {
  const out: InlineNode[] = [];
  const codeParts = src.split(/(`[^`]+`)/g);
  for (const part of codeParts) {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      out.push({ t: "code", v: part.slice(1, -1) });
      continue;
    }
    // Bold before italic so **x** isn't read as two italics.
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    for (const b of boldParts) {
      if (b.startsWith("**") && b.endsWith("**") && b.length >= 4) {
        out.push({ t: "bold", v: b.slice(2, -2) });
        continue;
      }
      const itParts = b.split(/(\*[^*]+\*)/g);
      for (const c of itParts) {
        if (c.startsWith("*") && c.endsWith("*") && c.length >= 2) {
          out.push({ t: "italic", v: c.slice(1, -1) });
        } else if (c) {
          out.push({ t: "text", v: c });
        }
      }
    }
  }
  return out.filter((n) => n.v.length > 0);
}

export function parseBlocks(src: string): BlockNode[] {
  const blocks: BlockNode[] = [];
  const chunks = src.split(/\n{2,}/);
  for (const chunk of chunks) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) continue;
    const heading = lines.length === 1 && lines[0].match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      blocks.push({
        t: "heading",
        level: Math.min(heading[1].length, 3) as 1 | 2 | 3,
        inline: parseInline(heading[2]),
      });
      continue;
    }
    if (lines.every((l) => /^[-*]\s+/.test(l))) {
      blocks.push({ t: "ul", items: lines.map((l) => parseInline(l.replace(/^[-*]\s+/, ""))) });
      continue;
    }
    if (lines.every((l) => /^\d+[.)]\s+/.test(l))) {
      blocks.push({ t: "ol", items: lines.map((l) => parseInline(l.replace(/^\d+[.)]\s+/, ""))) });
      continue;
    }
    // Mixed single newlines inside a paragraph: join with space, unless the
    // whole chunk is one line (keeps line-break-heavy answers readable).
    blocks.push({ t: "para", inline: parseInline(lines.join(" ")) });
  }
  return blocks;
}
