import { describe, expect, it } from "vitest";
import {
  buildRecallQuery,
  checkRedaction,
  checkResolutionGrounding,
  detectResolution,
  dropKnownFacts,
  formatSharedFix,
  parseSharedFix,
  validateExtractedFacts,
  validateSharedCandidate,
} from "../support-memory";

describe("detectResolution", () => {
  it("catches explicit resolution language", () => {
    expect(detectResolution("That fixed it, thanks!")).toBe(true);
    expect(detectResolution("Works now, the CSV imported fine")).toBe(true);
    expect(detectResolution("problem solved")).toBe(true);
  });
  it("does not infer from ordinary questions", () => {
    expect(detectResolution("My CSV import is failing with a 422")).toBe(false);
    expect(detectResolution("What should I check?")).toBe(false);
    expect(detectResolution("ok")).toBe(false);
  });
});

describe("buildRecallQuery", () => {
  it("strips filler so substance matches", () => {
    const q = buildRecallQuery("My CSV import is failing with a 422. What should I check?", []);
    expect(q).not.toMatch(/what should i check/i);
    expect(q).toMatch(/CSV import/i);
    expect(q).toMatch(/422/);
  });
  it("adds previous user-turn context", () => {
    const q = buildRecallQuery("What about the delimiter?", [
      { role: "user", text: "My CSV import fails with 422" },
    ]);
    expect(q).toMatch(/CSV import fails with 422/);
    expect(q).toMatch(/delimiter/);
  });
});

describe("shared fix format + gate", () => {
  const good = formatSharedFix({
    symptom: "CSV import returns HTTP 422",
    cause: "Semicolon-delimited CSV from some Excel exports",
    resolution: "Re-export as comma-delimited CSV UTF-8 and retry",
  });
  it("round-trips the typed shape", () => {
    expect(parseSharedFix(good)).toEqual({
      symptom: "CSV import returns HTTP 422",
      cause: "Semicolon-delimited CSV from some Excel exports",
      resolution: "Re-export as comma-delimited CSV UTF-8 and retry",
    });
  });
  it("passes validation when clean", () => {
    expect(validateSharedCandidate(good).ok).toBe(true);
  });
  it("rejects malformed shapes", () => {
    expect(validateSharedCandidate("just some text").ok).toBe(false);
    expect(
      validateSharedCandidate("[SHARED_FIX]\nSymptom: x\nCause: y").ok,
    ).toBe(false);
  });
  it("rejects PII/secrets", () => {
    const bad =
      "[SHARED_FIX]\nSymptom: 422\nCause: bad file from alice@example.com\nResolution: retry";
    const r = validateSharedCandidate(bad);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/redaction/);
    expect(checkRedaction("see meros:user:abc123def456 for details").passed).toBe(false);
    expect(checkRedaction("key 0xabc123def4567890fedcba failed").passed).toBe(false);
  });
});

describe("extraction validation", () => {
  it("keeps only well-formed, safe facts", () => {
    const out = validateExtractedFacts([
      { type: "issue", text: "CSV upload returns HTTP 422 error code" },
      { type: "JOKE", text: "something funny happened today ok" },
      { type: "PROFILE", text: "x" },
      { type: "PROFILE", text: "Contact me at bob@example.com please!" },
    ]);
    expect(out).toEqual([
      { type: "ISSUE", text: "[ISSUE] CSV upload returns HTTP 422 error code" },
    ]);
  });
  it("drops facts restating known memory", () => {
    const out = dropKnownFacts(
      [{ type: "PROFILE", text: "[PROFILE] Uses Excel 2021 on Windows" }],
      ["[PROFILE] Uses Excel 2021 on Windows"],
    );
    expect(out).toEqual([]);
  });
});

describe("resolution fidelity (Alice CSV 422 regression)", () => {
  // Exact live scenario: Excel 2021, semicolon-delimited CSV, HTTP 422.
  const CONFIRMATION = [
    "My CSV import keeps failing with HTTP 422. I'm using Excel 2021 on Windows. The file was exported from Excel as semicolon-delimited.",
    "I re-exported it as CSV UTF-8 with comma delimiters and the import works now. That fixed it.",
  ].join("\n");
  // Assistant suggested (but user never confirmed) a text-editor find-and-replace.
  const CONTEXT = [
    CONFIRMATION,
    "Check the file encoding and delimiter. You could also open the file in a text editor and use find-and-replace to swap semicolons for commas.",
  ].join("\n");

  const GOOD = [
    "[SHARED_FIX]",
    "Symptom: CSV import returns HTTP 422.",
    "Cause: The CSV likely uses semicolon delimiters instead of the comma delimiters expected by the importer.",
    "Resolution: Re-export the file as CSV UTF-8 with comma delimiters and retry the import.",
  ].join("\n");

  const SUBSTITUTED = [
    "[SHARED_FIX]",
    "Symptom: CSV import returns HTTP 422.",
    "Cause: Likely cause: semicolon delimiters.",
    "Resolution: Open the file in a text editor or spreadsheet program, replace all semicolons with commas, save the file, and retry the import.",
  ].join("\n");

  it("grounds the confirmed re-export resolution", () => {
    const g = checkResolutionGrounding(
      "Re-export the file as CSV UTF-8 with comma delimiters and retry the import.",
      CONFIRMATION,
      CONTEXT,
    );
    expect(g.grounded).toBe(true);
    expect(g.confirmOverlap).toBeGreaterThanOrEqual(0.4);
  });

  it("accepts the faithful candidate through the full gate", () => {
    const gate = validateSharedCandidate(GOOD, { confirmation: CONFIRMATION, context: CONTEXT });
    expect(gate.ok).toBe(true);
    expect(gate.candidate?.resolution).toMatch(/re-export/i);
    expect(gate.candidate?.resolution).toMatch(/utf-8/i);
    expect(gate.candidate?.resolution).toMatch(/comma/i);
    expect(gate.candidate?.resolution).not.toMatch(/find-and-replace|text editor/i);
    expect(gate.candidate?.cause).not.toMatch(/^likely cause:/i);
    expect(gate.candidate?.cause).toMatch(/likely/i);
  });

  it("rejects the substituted find-and-replace resolution", () => {
    const g = checkResolutionGrounding(
      "Open the file in a text editor or spreadsheet program, replace all semicolons with commas, save the file, and retry the import.",
      CONFIRMATION,
      CONTEXT,
    );
    expect(g.grounded).toBe(false);
    const gate = validateSharedCandidate(SUBSTITUTED, { confirmation: CONFIRMATION, context: CONTEXT });
    expect(gate.ok).toBe(false);
    expect(gate.error).toMatch(/grounded|substitut/i);
  });

  it("refuses a resolution grounded in nothing the user said", () => {
    const g = checkResolutionGrounding(
      "Rebuild the database index and restart the cluster nodes.",
      CONFIRMATION,
      CONTEXT,
    );
    expect(g.grounded).toBe(false);
  });
});

describe("false-negative fix (verbatim live two-turn conversation)", () => {
  // Exact user turns from the live repro. Assistant advice (incl. an
  // unconfirmed text-editor suggestion) is context only.
  const TURN1 =
    "My CSV import keeps failing with HTTP 422. I'm using Excel 2021 on Windows. I noticed the file has semicolons between the fields instead of commas.";
  const TURN2 =
    "I re-exported it as CSV UTF-8 with comma delimiters and the import works now. That fixed it.";
  const ASSISTANT =
    "The server expects comma-separated values but the file is semicolon-separated. Re-export from Excel as CSV, or open it in a text editor and replace the delimiters.";
  const CONFIRMATION = [TURN1, TURN2].join("\n");
  const CONTEXT = [CONFIRMATION, ASSISTANT].join("\n");

  it("A. PASS — preserves re-export / CSV UTF-8 / comma delimiters", () => {
    const resolution = "Re-export the file as CSV UTF-8 with comma delimiters and retry.";
    const g = checkResolutionGrounding(resolution, CONFIRMATION, CONTEXT);
    expect(g.grounded).toBe(true);
    const text = [
      "[SHARED_FIX]",
      "Symptom: CSV import returns HTTP 422.",
      "Cause: The CSV likely uses semicolon delimiters instead of comma delimiters expected by the importer.",
      `Resolution: ${resolution}`,
    ].join("\n");
    const gate = validateSharedCandidate(text, { confirmation: CONFIRMATION, context: CONTEXT });
    expect(gate.ok).toBe(true);
  });

  it("B. REJECT — text-editor replacement was never user-confirmed", () => {
    const g = checkResolutionGrounding(
      "Open the file in a text editor and replace semicolons with commas.",
      CONFIRMATION,
      CONTEXT,
    );
    expect(g.grounded).toBe(false);
  });

  it("C. NONE — casual non-confirmation grounds nothing", () => {
    const g = checkResolutionGrounding(
      "Re-export the file as CSV UTF-8 with comma delimiters and retry.",
      "Okay, I'll try that.",
      "Okay, I'll try that.",
    );
    expect(g.grounded).toBe(false);
  });
});
