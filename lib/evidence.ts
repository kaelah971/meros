// Session-only evidence collector (client-side).
// Events live in sessionStorage: they survive in-tab reloads but vanish with
// the browser session. Anything here is explicitly ephemeral — durable proof
// lives in Walrus (blob references), and cross-restart history needs Neon
// (DATABASE_URL, currently optional/absent).

export type EvidenceEvent =
  | {
      kind: "private-write";
      ts: number;
      workspace?: string;
      text: string;
      blobId: string;
      status: "stored" | "failed";
    }
  | {
      kind: "shared-write";
      ts: number;
      workspace?: string;
      text: string;
      blobId: string;
    }
  | {
      kind: "compare";
      ts: number;
      workspace?: string;
      question: string;
      privateUsed: boolean;
      sharedUsed: boolean;
      snippets: { plane: "private" | "shared"; text: string; blobId: string; distance: number }[];
      baselineChars: number;
    };

const KEY = "meros.sessionEvidence.v1";

function store(): Storage | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

export function readEvidence(): EvidenceEvent[] {
  const s = store();
  if (!s) return [];
  try {
    const raw = s.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as EvidenceEvent[]) : [];
  } catch {
    return [];
  }
}

type NoTs<T> = T extends { ts: number } ? Omit<T, "ts"> : never;
export type EvidenceInput = NoTs<EvidenceEvent>;

export function recordEvidence(e: EvidenceInput): void {
  const s = store();
  if (!s) return;
  try {
    const arr = readEvidence();
    arr.push({ ...e, ts: Date.now() } as EvidenceEvent);
    s.setItem(KEY, JSON.stringify(arr.slice(-100)));
  } catch {
    // Evidence must never break chat.
  }
}

export function clearEvidence(): void {
  try {
    store()?.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function shortBlob(b: string): string {
  return b.length > 18 ? `${b.slice(0, 10)}…${b.slice(-6)}` : b;
}
