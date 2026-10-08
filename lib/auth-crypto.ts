// Pure input validators for owner/org flows. No server-only import so this
// stays unit-testable. NOTE: password hashing and session tokens were
// removed with the Better Auth migration — Better Auth (scrypt via its
// password hashing + managed sessions) is the sole runtime auth system.
export function validateEmail(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("email must be a string");
  const email = raw.trim().toLowerCase();
  if (email.length > 254) throw new Error("email too long");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error("invalid email address");
  return email;
}

export function validatePassword(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("password must be a string");
  if (raw.length < 10) throw new Error("password must be at least 10 characters");
  if (raw.length > 256) throw new Error("password too long");
  return raw;
}

export function validateDisplayName(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("name must be a string");
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2) throw new Error("name must be at least 2 characters");
  if (name.length > 80) throw new Error("name too long");
  return name;
}

/**
 * Owner identity presentation: the display name is primary, the email is
 * secondary metadata. Legacy accounts without a stored name fall back to
 * the email temporarily — never blank, never an ID.
 */
export function displayIdentity(
  displayName: string | null | undefined,
  email: string,
): { primary: string; secondary: string } {
  const name = typeof displayName === "string" ? displayName.trim() : "";
  if (name) return { primary: name, secondary: email };
  return { primary: email, secondary: email };
}

export function validateOrgName(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("organization name must be a string");
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2) throw new Error("organization name too short");
  if (name.length > 80) throw new Error("organization name too long");
  return name;
}

/** URL-safe org slug derived from a name; uniqueness is enforced in the DB. */
export function slugifyOrgName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return base.length >= 2 ? base : "org";
}
