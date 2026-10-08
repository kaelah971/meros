# Meros — P0: Real Memory Spine

> Solve it once. Remember it for everyone. (P0 proves the memory half; the chatbot loop comes next.)

## What P0 does

- Access code → server-derived private namespace `meros:user:<sha256-hex>`
- Real Walrus Memory **Mainnet** write via `@mysten-incubation/memwal` (`rememberAndWait` — no fire-and-forget)
- `stored` only after Walrus completion + blob/reference capture
- Fresh-session semantic recall from Walrus (no LLM, no transcript, no Postgres fallback)
- Utilitarian diagnostic UI at `/dev`

## Quick start

```bash
cp .env.example .env.local   # fill in real values, never commit
npm install
npm run dev                  # open http://localhost:3000/dev
```

## Env (all server-only except derivation salt)

| Var | Required for P0 proof | Notes |
|---|---|---|
| `MEMWAL_PRIVATE_KEY` | yes — write/recall | Ed25519 delegate key (hex or `suiprivkey1...`) |
| `MEMWAL_ACCOUNT_ID` | yes — write/recall | Walrus Memory account object ID (`0x...`) on Sui |
| `MEMWAL_SERVER_URL` | no | Defaults to Mainnet relayer `https://relayer.memory.walrus.xyz` |
| `DATABASE_URL` | no | Neon metadata only (users, memory_jobs). App runs without it; `persisted:false` in write response |
| `GEMINI_API_KEY` | no | Scaffold only in P0 |
| `MEROS_ID_SALT` | no | Defaults to `meros-p0-v1`. Changing it remaps all namespaces |

## Chat (memory-aware support)

`/chat` — access-code entry → thread + composer → Gemini Flash answer with a
**Memory Lens** per answer ("Why this answer?" → Your private memory ·
Shared support memory · Current conversation). `POST /api/chat` takes only
`{accessCode, message, history}`; the server derives private + shared
namespaces, recalls both planes in parallel, filters at distance < 0.8,
dedupes by blob/text, caps count/tokens, and returns provenance strictly from
injected memories. Zero-memory users get a normal useful answer with honest
"No relevant memory found" copy. No promotion workflow yet — shared fixes
stay empty until a later slice.

## Diagnostic proof (fresh-session)

1. Open `/dev`, enter access code e.g. `P0-ALICE-01`
2. Write `[PROFILE] Uses Excel 2021 on Windows` → wait for **Stored on Walrus + blob**
3. Click **Clear / new session** (drops all UI state)
4. Same access code → recall query `What spreadsheet app and OS does the user use?`
5. Earlier Walrus memory returns with text + distance + blob

## API

- `GET /api/health` — configured flags (no secrets)
- `POST /api/memory/write` — `{accessCode, text, type?}` → `{status:"stored", blobId, namespace}` or honest `blocked`/`failed`
- `POST /api/memory/recall` — `{accessCode, query, topK?}` → `{namespace, results:[{text, distance, blobId}]}`

The client can never submit a namespace; routes derive it server-side from the access code.

## Neon setup (optional for P0)

```bash
# in Neon SQL editor:
\i db/schema.sql
```

Creates minimal `users` + `memory_jobs` (status: pending/saving/stored/failed + blob_id + error). Walrus remains the durable store.

## Verification

```bash
npm test        # identity tests (5 passing)
npm run typecheck
npm run build
```

## What P0 does NOT build

Shared memory, Fix Card/promotion, Compare, Evidence dashboard, final branding, chat loop, Slack/Telegram/Discord.
