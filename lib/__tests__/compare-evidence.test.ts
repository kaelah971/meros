import { describe, expect, it } from "vitest";
import { parseBlocks, parseInline } from "../markdown";
import { NO_MEMORY_SYSTEM_INSTRUCTION } from "../chat-memory";

describe("parseInline", () => {
  it("handles bold, italic, and code", () => {
    expect(parseInline("a **bold** word")).toEqual([
      { t: "text", v: "a " },
      { t: "bold", v: "bold" },
      { t: "text", v: " word" },
    ]);
    expect(parseInline("an *italic* word")).toContainEqual({ t: "italic", v: "italic" });
    expect(parseInline("run `npm test` now")).toContainEqual({ t: "code", v: "npm test" });
  });

  it("keeps formatting inside code spans literal", () => {
    expect(parseInline("`**not bold**`")).toEqual([{ t: "code", v: "**not bold**" }]);
  });

  it("leaves raw HTML as inert text (never executed)", () => {
    const nodes = parseInline('click <script>alert("x")</script> here');
    expect(nodes.every((n) => n.t === "text")).toBe(true);
    expect(nodes.map((n) => n.v).join("")).toBe('click <script>alert("x")</script> here');
  });
});

describe("parseBlocks", () => {
  it("detects headings, lists, and paragraphs", () => {
    const blocks = parseBlocks("### Fix it\n\nDo this first.\n\n- one\n- two\n\n1. step\n2. step");
    expect(blocks[0]).toMatchObject({ t: "heading", level: 3 });
    expect(blocks[1].t).toBe("para");
    expect(blocks[2]).toMatchObject({ t: "ul" });
    expect(blocks[3]).toMatchObject({ t: "ol" });
    if (blocks[2].t === "ul") expect(blocks[2].items).toHaveLength(2);
  });

  it("does not mistake body text starting with # for headings", () => {
    const blocks = parseBlocks("C# is a language");
    expect(blocks[0].t).toBe("para");
  });
});

describe("NO_MEMORY_SYSTEM_INSTRUCTION", () => {
  it("declares the no-memory baseline explicitly", () => {
    expect(NO_MEMORY_SYSTEM_INSTRUCTION).toMatch(/no-memory baseline/i);
    expect(NO_MEMORY_SYSTEM_INSTRUCTION).toMatch(/No long-term memory was consulted/);
    expect(NO_MEMORY_SYSTEM_INSTRUCTION).not.toMatch(/PRIVATE MEMORY/);
  });
});
