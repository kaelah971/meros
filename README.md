# Meros — memory-native support platform

> **Support memory that compounds. Solve it once. Remember it for everyone.**

Meros remembers each customer privately and turns approved support resolutions
into reusable organizational memory:

1. **Customers get support with context.** Returning customers never repeat
   their setup; environment, attempts, and history carry across sessions.
2. **Resolved issues become reviewable Fix Cards.** A confirmed resolution is
   distilled into a sanitized candidate a human must approve — nothing is
   ever auto-shared.
3. **Approved fixes help the next customer.** The next person with the same
   symptom gets the proven fix first, with visible provenance.

> **Share the fix. Keep the customer private.** Private memory never crosses
> customers or workspaces; only explicitly approved fixes become shared.

## Architecture: who owns what

| Layer | Owns | Never |
|---|---|---|
| **Neon Postgres** | Product/operational state: users, orgs, workspaces, customers, conversations, messages, issues, Fix Card metadata, write jobs | Long-term AI memory (no transcript RAG fallback) |
| **Walrus Memory (Mainnet)** | Durable long-term memory: per-customer private namespaces + approved shared fixes | Request routing, auth, product state |
| **Gemini** | Answer generation, fact extraction, Fix Card summarization | Memory storage, identity |

Memory model:

- Private namespace: `meros:v2:workspace:<wsid>:customer:<cid>` — derived
  server-side from immutable IDs; clients can never submit namespaces.
- Shared namespace: `meros:v2:workspace:<wsid>:shared:fixes` — written only
  after explicit staff approval (`Save shared`); `Keep private` performs zero
  Walrus writes.
- Recalled memory is untrusted data (fenced in prompts, never instructions).

Privacy / tenant model:

- Every memory operation resolves `session user → workspace customer`
  (customers) or `session user → organization_members → workspace` (staff).
- Same account in two workspaces gets two isolated customer identities.
- Raw access codes never persist; only salted hashes (legacy dev path only).

## Setup

```bash
cp .env.example .env.local   # fill in real values, never commit
npm install
npm run db:migrate           # additive/idempotent Neon schema setup
npm run dev                  # open http://localhost:3002
```

Build / verify:

```bash
npm test          # vitest (live Neon + Walrus-backed integration where marked)
npm run typecheck # tsc --noEmit
npm run build     # production build
```

## Environment variables (all server-only)

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon Postgres connection string |
| `MEMWAL_PRIVATE_KEY` | yes | Ed25519 delegate key (hex or `suiprivkey1...`) |
| `MEMWAL_ACCOUNT_ID` | yes | Walrus Memory account object ID (`0x...`) |
| `MEMWAL_SERVER_URL` | no | Defaults to Mainnet relayer |
| `MEROS_ID_SALT` | no | Defaults to `meros-p0-v1`; changing it remaps legacy namespaces |
| `GEMINI_API_KEY` | yes | Answer generation, extraction, Fix Cards |
| `GEMINI_MODEL` | no | Defaults to `gemini-3.5-flash-lite` (must be a real `models.list` ID) |
| `GEMINI_FALLBACK_MODEL` | no | Used only after retryable primary failures |
| `BETTER_AUTH_URL` | yes | Public origin of the deployment (e.g. `http://localhost:3002`); origin validation stays on |
| `BETTER_AUTH_SECRET` | yes | Long-lived signing secret; process fails fast in production without it |
| `MEROS_ENABLE_LEGACY_DEV_IDENTITY` | no | Local diagnostics only (`/chat`, `/dev`, raw access-code endpoints). Unset/false = session-only. **Never honored in production.** |

## Main routes

| Route | Who | Purpose |
|---|---|---|
| `/` | public | Product landing |
| `/signup`, `/login` | public | Owner account entry |
| `/app`, `/app/workspaces/[slug]/*` | owner/staff | Organizations, console: Overview, Conversations, Customers, Fix Cards, Shared memory |
| `/support/[slug]` | customer | Authenticated support chat + history + resolution |
| `/evidence` | anyone | **Demo/hackathon proof surface** — session-only, never customer-facing |
| `/chat`, `/dev` | local dev only | Diagnostic consoles (404 unless the legacy dev flag is set) |
| `/api/health` | public | Safe deployment check: config booleans only, no secrets, no Walrus/Gemini calls |

## Alice → Bob proof flow

1. Alice signs up at `/support/acme`, reports an issue (persisted conversation).
2. Alice confirms the fix → issue resolves → grounded Fix Card awaits review.
3. Staff open the workspace console → Fix Cards → **Save shared** → Walrus blob recorded.
4. Bob signs up at the same workspace, asks about the same symptom → shared
   recall surfaces the fix → Memory Lens shows provenance.
5. **Compare without memory** reruns the same question with memory disabled
   to show the observable difference.
6. A different workspace (e.g. Nova) recalls nothing from Acme.
