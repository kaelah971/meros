import { createHash } from "node:crypto";
import { getIdSalt } from "./env";

export const NAMESPACE_PREFIX = "meros:user:";

export function normalizeAccessCode(raw: string): string {
  // Case-insensitive, whitespace-tolerant. Internal use only.
  return raw.trim().toUpperCase().replace(/\s+/g, " ");
}

export function validateAccessCode(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("accessCode must be a string");
  const normalized = normalizeAccessCode(raw);
  if (normalized.length < 4)
    throw new Error("accessCode must be at least 4 characters");
  if (normalized.length > 128)
    throw new Error("accessCode must be at most 128 characters");
  if (!/^[\p{L}\p{N} _\-]+$/u.test(normalized))
    throw new Error("accessCode contains unsupported characters");
  return normalized;
}

/** Deterministic stable user id. Never equals the raw access code. */
export function deriveUserId(normalizedCode: string, salt?: string): string {
  const s = salt ?? getIdSalt();
  return createHash("sha256").update(`${s}:${normalizedCode}`, "utf8").digest("hex");
}

/** Server-derived private namespace. Client input can never supply this. */
export function deriveNamespace(userIdHex: string): string {
  return `${NAMESPACE_PREFIX}${userIdHex}`;
}

/** One call: validate code -> derive user id + namespace. */
export function identityFromAccessCode(
  rawCode: unknown,
  salt?: string,
): { normalized: string; userId: string; namespace: string } {
  const normalized = validateAccessCode(rawCode);
  const userId = deriveUserId(normalized, salt);
  return { normalized, userId, namespace: deriveNamespace(userId) };
}

/** Safe public preview: first 8 hex chars only. Never log full ids or codes. */
export function previewUserId(userId: string): string {
  return `${userId.slice(0, 8)}…`;
}
