/**
 * Deterministic UTC date formatting for SSR-rendered timestamps.
 *
 * `Date.toLocaleString()` (and friends) render with the RUNTIME's locale and
 * timezone: the server (e.g. en-GB "09/10/2026, 02:50:25") and the
 * browser (e.g. en-US "10/9/2026, 2:50:25 AM") disagree, which causes React
 * hydration mismatches on every server-rendered timestamp. This helper builds
 * the string manually from UTC parts — no ICU/locale/timezone dependence, so
 * server and client render byte-identical output.
 *
 * Format: "09 Oct 2026, 02:50:25 UTC".
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatUtc(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} UTC`;
}
