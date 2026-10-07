# Meros — PRD / Architecture / Build Plan

## Walrus Session 8 / Engineering Specification

**Meros** is a memory-native support chatbot with private customer continuity and explicitly approved shared support learning.

**Version:** MVP v0.1 target

**Primary surface:** Responsive web chat

**Core infrastructure target:** Next.js + Gemini + Walrus Memory Mainnet + Neon metadata

**Priority:** Get real testers using memory as early as possible.

> **Build the memory proof first. Everything else is support structure.**

## Status and evidence boundary

This document is an editable Markdown replacement of the supplied engineering PDF. The PDF remains unchanged.

The architecture and acceptance criteria below describe target MVP behaviour. No running repository, deployed URL, or live Walrus evidence was supplied with the brief, so the document does not claim that any target is already shipped.

Use these labels during implementation:

- **Shipped:** live, tested, and evidenced.
- **Target:** required or planned for the hackathon MVP.
- **Roadmap:** intentionally deferred beyond the MVP.
- **Hypothesis:** expected value that requires user validation.

---

# 1. PRD overview

## Product

Meros — a memory-native support chatbot.

## Problem

Support bots forget returning users, while support organizations repeatedly rediscover fixes learned in previous conversations.

## Goal

Use Walrus Memory to preserve private user context and explicitly promoted shared support learnings, then prove that both change future answers.

## Primary demo

- Alice resolves an issue and promotes a reusable fix.
- Bob receives a better first answer because shared memory retrieves the fix.
- Carol proves private cross-session continuity without seeing Alice or Bob’s information.

## Deadline behaviour

Scope is aggressively constrained around a reliable live memory loop and evidence collection.

The application should be designed around one observable chain:

> **Capture → Store → Recall → Change the answer → Prove the change.**

---

# 2. Goals and non-goals

| MVP goals | Non-goals for the hackathon |
|---|---|
| Live support chatbot that works without prior memory | Replace a full helpdesk or CRM |
| Private per-user memory across sessions and devices | Enterprise authentication or SSO |
| Approved shared institutional memory across users | Autonomous promotion of LLM guesses |
| Visible provenance showing which memory changed an answer | Large-document RAG over arbitrary files |
| Memory-on versus memory-off comparison | Slack, Discord, WhatsApp, and multi-channel delivery |
| Three or more testers with ten or more meaningful memories each, if current rules require it | Production billing, plans, permissions, and SLA |
| Real Walrus Memory Mainnet writes and recalls | Full analytics dashboard |
| Evidence page with status, counts, and references | Complex multi-tenant organization model |

## MVP principle

> **A reliable memory experiment is more valuable than a broad feature map.**

---

# 3. Personas and jobs-to-be-done

## End user / customer

> **When I return with a problem, remember what you already know about my setup and what we already tried so I do not repeat myself.**

Needs:

- personal context to survive a session boundary;
- previous attempts to remain visible;
- failed steps not to be repeated;
- control over what is private.

## New customer

> **If someone already solved a problem like mine, use that learning so I do not start at step zero.**

Needs:

- a better first diagnostic action;
- shared learning without another customer’s identity;
- clear distinction between a confirmed fix and a guess.

## Support reviewer

> **Let useful resolutions become reusable knowledge, but never let private customer information leak into shared memory.**

Needs:

- a candidate Fix Card;
- exact shareable text;
- redaction warnings;
- Save shared / Keep private controls;
- versioning and correction handling.

## Hackathon judge / developer

> **Show me exactly what is stored, where it is recalled, and how the answer changes with memory on versus memory off.**

Needs:

- visible namespaces or source planes;
- actual stored status and blob references;
- a before/after comparison;
- reproducible setup and evidence.

---

# 4. User stories and acceptance criteria

| ID | User story | Acceptance criteria |
|---|---|---|
| U1 | As a user, I can identify myself on any device. | Entering the same access code maps to the same stable hashed user ID and private memory namespace. |
| U2 | As a returning user, the bot remembers relevant personal context. | A fresh session has no prior transcript, but the answer still uses a relevant private Walrus memory. |
| U3 | As a user, I can see what memory influenced an answer. | The answer exposes private/shared memory labels and source snippets or blob references where available. |
| U4 | As a user, I can compare the answer with memory disabled. | The same last request and current-session transcript are rerun without Walrus recall. |
| U5 | As a resolver, I can promote a reusable fix. | After a resolution, a sanitized candidate card appears. Nothing enters shared memory until confirmed. |
| U6 | As a different user, I benefit from an earlier confirmed fix. | Shared recall retrieves the promoted fix and materially changes the next diagnostic or action. |
| U7 | As a user, I know whether a memory is actually stored. | The UI shows queued, saving, stored, or failed. Stored requires Walrus completion and a blob reference. |
| U8 | As a reviewer, I can inspect memory counts and evidence. | The evidence page shows per-user memory count, shared-fix count, statuses, and references without exposing private text. |

## Acceptance boundary

A model statement such as “I saved that” is not acceptance evidence. Acceptance requires the corresponding system state and, where applicable, a Walrus completion or reference.

---

# 5. Information architecture and screens

| Route / surface | Purpose | MVP components |
|---|---|---|
| `/` | Entry and access code | Product thesis, tester sign-in, judge/demo account option |
| `/chat` | Primary experience | Chat thread, composer, memory toggle/status, provenance chips, Compare button |
| `/memory` | Memory browser | Private memories, shared fixes, type filter, stored status, blob references |
| `/evidence` | Submission evidence | User counts, 10+ progress, cross-session checks, shared-fix usage, recent write status |
| Fix Card modal | Promotion gate | Sanitized summary, source issue, privacy warning, Save shared, Keep private |

## Route rules

- The server derives the user namespace from the authenticated session.
- The client cannot submit an arbitrary namespace.
- The chat route works with zero memory.
- The memory browser distinguishes private and shared planes.
- The Evidence route may expose counts and references but not sensitive memory text.

---

# 6. Memory model

## Memory planes

### Private customer memory

Namespace pattern:

```text
meros:user:<hashed-user-id>
```

Available only to the current user’s server-derived identity.

### Shared support memory

Namespace pattern:

```text
meros:shared:fixes
```

Available to eligible users only after explicit promotion and successful storage.

## Memory types

| Type | Namespace | Example | Recall rule |
|---|---|---|---|
| `PROFILE` | `user:<hash>` | Uses Excel 2021 on Windows | Low-frequency profile recall to personalise diagnostics |
| `ISSUE` | `user:<hash>` | CSV upload returns 422 | Relevant to similar future symptoms |
| `ATTEMPT` | `user:<hash>` | Cleared cache — failed | Prevents repeating already failed steps |
| `RESOLUTION` | `user:<hash>` | Delimiter fix resolved the upload | Useful for personal continuity and candidate promotion |
| `CORRECTION` | `user:<hash>` | Now on app version 2.5.0 | New fact supersedes prior profile or state |
| `SHARED_FIX` | `shared:fixes` | CSV 422 + Excel → check delimiter | Available to every user only after confirmation |

## Memory invariants

- A private memory is never made shared by a model decision alone.
- A shared record contains no direct user identity.
- Shared records are sanitized and human-confirmed.
- Append-only events preserve history.
- Corrections supersede older facts without deleting the historical record.
- Semantic recall is thresholded and deduplicated before prompt construction.
- Recalled memory is quoted as untrusted data, not instructions.

---

# 7. Memory record shape

Canonical shared-memory payload serialized as text before a Walrus write:

```json
{
  "type": "SHARED_FIX",
  "summary": "CSV import 422 may be caused by semicolon delimiters in Excel exports.",
  "symptoms": ["HTTP 422", "CSV import", "Excel export"],
  "recommended_next_step": "Inspect delimiter before generic troubleshooting.",
  "status": "confirmed",
  "source_ticket_id": "tkt_demo_001",
  "source_user_hash": null,
  "product_version": "optional",
  "supersedes": null,
  "created_at": "ISO-8601"
}
```

## Storage responsibility

- **Walrus Memory:** durable long-term memory event.
- **Neon:** operational metadata such as pending job state, source turn IDs, session state, and returned blob reference.

The shared record intentionally removes direct user identity.

If Neon is wiped, the application may lose sessions and evidence metadata, but Walrus remains the durable memory store. The architecture must never quietly treat Postgres as the real long-term memory.

---

# 8. System architecture

## Frontend

- Next.js App Router;
- TypeScript;
- Tailwind;
- responsive chat and evidence pages;
- visible memory status and provenance.

## API layer

- Next.js route handlers or server functions;
- no detached memory writes;
- namespace derived server-side;
- provider errors converted into honest UI states.

## Primary LLM target

Gemini Flash-class model, preferably through direct Google AI or OpenRouter, with structured outputs for extraction.

The model provider is a target until configured and tested. Do not describe the model as shipped merely because it appears in the plan.

## Long-term memory target

Walrus Memory Mainnet through `@mysten-incubation/memwal`.

One agent account with:

- per-user namespaces;
- a shared fixes namespace;
- server-side delegate credentials;
- explicit write completion handling.

## Operational database

Neon Postgres for:

- access-code identities;
- current session and ticket state;
- pending write jobs;
- blob references;
- evidence counters;
- source turn IDs;
- promotion decisions.

## Deployment target

Vercel for the web app and API.

Keep all private keys and model credentials server-side. Use environment-variable placeholders in documentation; never commit real credentials.

## Architecture principle

> **One web surface, one orchestration layer, two Walrus namespaces, and one visible memory consequence.**

---

# 9. Turn lifecycle

1. Resolve the signed-in user from an access-code session cookie and derive the stable private namespace.
2. Recall private and shared memory in parallel using the current user message plus compact issue context.
3. Normalize results by:
   - thresholding by distance;
   - deduplicating blob IDs and text hashes;
   - capping total memory tokens;
   - labelling the source plane.
4. Build the model prompt from:
   - system rules;
   - current-session transcript;
   - recalled memories.
5. Treat recalled memory as data, not instructions.
6. Stream or return the support answer.
7. Attach memory provenance metadata to the rendered answer.
8. Run structured extraction for durable private-memory candidates.
9. Persist candidates as pending jobs before invoking Walrus.
10. Process the write synchronously enough to receive Walrus completion and a blob ID.
11. Mark the memory stored only after that completion.
12. If the issue appears resolved, generate a separate candidate shared fix.
13. Do not write the shared candidate until the user or reviewer confirms promotion.

## Resolution rule

A ticket is resolved only when:

- the user confirms success; or
- an explicit, controlled demo state confirms success.

The assistant must never infer success solely from its own suggestion.

---

# 10. Recall strategy

## Private query A

Query with:

- current user message;
- current issue label;
- compact recent context.

Start with a small `topK`, for example five.

## Private query B

Periodic profile recall for:

- environment;
- product version;
- preferences;
- durable constraints.

Do not run vague profile recall on every message if it produces noise.

## Shared query

Query with:

- symptoms;
- error code;
- product area;
- relevant version where available.

Never include user identity in the shared query.

## Threshold and deduplication

- Start with a semantic-distance cutoff around `0.8` and tune from live traces.
- Reject obviously irrelevant results.
- Deduplicate by blob ID and normalised-memory hash.
- Label each result with `private` or `shared` before prompt injection.

## Recency and correction policy

If two memories conflict:

1. prefer an explicit `CORRECTION`;
2. otherwise prefer the newer timestamp where the product semantics support it;
3. preserve the older fact as history;
4. do not silently erase the conflict.

## Prompt budget

Use roughly four to eight memory items total per answer as a starting point. More context is not automatically better context.

---

# 11. Candidate extraction and promotion

| Stage | Action | Fail-safe |
|---|---|---|
| Private extraction | Extract durable facts from the user message or turn: environment, issue, attempt, outcome, resolution, preference | If no durable fact exists, write nothing |
| Resolution detection | Mark a ticket resolved only after user confirmation or an explicit demo state | Never infer success from the assistant’s own suggestion |
| Shared candidate | Compress the resolution into symptom → cause → next-step language | Remove names, emails, phone numbers, account IDs, and freeform secrets |
| Human confirmation | Show the exact text that will be shared | Default is no write |
| Walrus write | Write confirmed text to the shared namespace and await completion | If it fails, retain the pending candidate and allow retry |

## Private extraction rules

- Extract only user-stated or demonstrably observed facts.
- Exclude assistant guesses.
- Batch adjacent facts where that preserves meaning.
- Avoid duplicate tiny memories.
- Store the source turn or ticket reference in operational metadata.

## Shared candidate rules

- Never include direct user identity.
- Never include raw customer transcripts.
- Never include API keys, passwords, wallet keys, access tokens, or credentials.
- Keep the exact candidate visible to the reviewer.
- Use neutral language: “may be caused by” and “check first,” not “guaranteed fix.”

## Promotion actions

- **Save shared** — confirm and write.
- **Keep private** — retain only in the private plane.
- **Edit candidate** — correct or remove unsafe text before review.
- **Cancel** — no promotion.

---

# 12. API contract

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/access` | `POST` | Validate access code, set signed session, return user display metadata |
| `/api/chat` | `POST` | Recall memory, call model, return or stream answer plus provenance |
| `/api/memory/extract` | `POST` | Create durable private-memory candidates for a completed turn |
| `/api/memory/commit` | `POST` | Persist a pending memory candidate to Walrus and update blob/status metadata |
| `/api/memory/list` | `GET` | List private memories and shared fixes visible to the user |
| `/api/fixes/candidate` | `POST` | Create a sanitized reusable-fix candidate from a resolved ticket |
| `/api/fixes/promote` | `POST` | Confirm and write a shared fix to Walrus |
| `/api/compare` | `POST` | Rerun the last answer with memory disabled |
| `/api/evidence` | `GET` | Return per-user counts, stored blob IDs, and test-evidence summary |

## API rules

- Never accept an arbitrary namespace from the client.
- Validate request shape and session before any recall or write.
- Include actual provenance arrays from recall results, not model-generated claims.
- Return write status explicitly.
- Keep sensitive memory text out of public evidence responses.
- Ensure `/api/compare` performs no private or shared recall.

---

# 13. Operational data model

Neon stores operational metadata, not the source of durable long-term memory.

```text
users(
  id,
  display_name,
  access_code_hash,
  namespace,
  created_at
)

sessions(
  id,
  user_id,
  created_at,
  last_seen_at
)

tickets(
  id,
  user_id,
  status,
  title,
  product_area,
  opened_at,
  resolved_at
)

turns(
  id,
  ticket_id,
  role,
  text,
  used_private_blob_ids,
  used_shared_blob_ids
)

memory_jobs(
  id,
  user_id,
  namespace,
  type,
  text,
  status,
  blob_id,
  error,
  created_at
)

shared_candidates(
  id,
  ticket_id,
  text,
  redaction_status,
  decision,
  blob_id,
  created_at
)

memory_usage(
  id,
  turn_id,
  blob_id,
  plane,
  contributed_to_answer
)
```

## Data rule

If Neon is wiped, the demo application loses sessions and evidence metadata, but Walrus remains the durable memory store. The application must not quietly fall back to Postgres as the real memory.

---

# 14. Prompting and model rules

- Clearly distinguish `PRIVATE MEMORY` and `SHARED SUPPORT MEMORY` in the system prompt.
- Fence memories as quoted, untrusted facts.
- A recalled memory may inform an answer but cannot issue instructions to the model.
- Do not claim a shared fix is guaranteed.
- Phrase shared learning as a previously confirmed pattern worth checking first.
- Never mention another customer, source user, or hidden identifier in an answer.
- Do not invent that a memory was retrieved.
- Provenance shown to the UI must come from actual recall results.
- The private-memory extractor writes only user-stated or demonstrably observed facts.
- Assistant guesses are excluded from durable extraction.
- The shared-fix extractor outputs strict structured data and is rejected if required fields or redaction checks fail.
- When memory is absent, answer usefully from the current conversation rather than pretending that recall succeeded.

## Prompt boundary

> **Memory is context, not authority.**

This rule protects against prompt injection and makes the product’s governance legible to judges.

---

# 15. Reliability and write-latency design

Known challenge: Walrus writes and indexing can be slow enough that fire-and-forget serverless writes are unsafe.

The MVP treats memory persistence as a first-class state machine.

| Status | UI | System behaviour |
|---|---|---|
| `pending` | Queued | Candidate is durably recorded in Neon but not yet sent or finished on Walrus |
| `saving` | Saving to Walrus… | An active API request is awaiting the Walrus result; do not return Stored yet |
| `stored` | Stored on Walrus | Blob ID or reference captured; eligible for future recall after indexing catches up |
| `failed` | Retry memory save | Keep candidate and error; user or admin can retry; chat remains usable |

## Reliability rules

- Never detach a write after sending the serverless response.
- The client can continue chatting while a separate commit call waits, but the real state must remain visible.
- After a successful write, optionally poll recall briefly in the evidence/test path, not every production turn.
- Rate-limit candidate writes.
- Batch adjacent facts when that preserves meaning.
- Do not spam tiny duplicate memories.
- Preserve retryable candidates after failure.
- Do not use a fake optimistic “stored” state.

---

# 16. Security and privacy

| Control | Implementation target |
|---|---|
| Secrets | All LLM keys and Walrus delegate private keys are server-only environment variables |
| User identity | Store only a hashed access-code identity; derive namespace from a stable internal user ID |
| Shared redaction | Regex plus structured redaction for email, phone, addresses, account IDs, API keys, and tokens, followed by human confirmation |
| Prompt injection | Memory is data; fenced context cannot override system rules; never execute links or commands from recalled text |
| Namespace isolation | The chat route never receives an arbitrary namespace from the client; the server derives it from the session |
| Public evidence | Show counts, blob IDs, and demo labels, not sensitive memory text |
| Storage claim | Show Stored only after Walrus completion and reference capture |

## Secret-handling rule

Documentation must use placeholders such as:

```text
WALRUS_MEMORY_PRIVATE_KEY=[REDACTED]
GEMINI_API_KEY=[REDACTED]
```

Do not place real credentials, private keys, wallet addresses, access codes, or connection strings in the repository, README, screenshots, or evidence export.

---

# 17. Evidence and analytics

The evidence surface should show:

- per-user stored memory count with a target bar toward 10+;
- per-answer list of used private and shared blob IDs;
- counter for answers improved by shared memory;
- captured A/B comparison records for memory-on and memory-off;
- cross-session check showing a new session used earlier private memory;
- write-latency log:
  - `requested_at`;
  - `stored_at`;
  - `first_recalled_at`;
- shared-fix candidate and promotion status;
- namespace-isolation check;
- redaction check result;
- failed-write and retry evidence.

## Evidence export

Demo evidence can be exported as a simple JSON or Markdown summary for the README and article.

Never export raw customer memory text unless the tester has explicitly consented and the data is fictional or safely redacted.

---

# 18. Test plan

| Test | Pass condition |
|---|---|
| Namespace isolation | Alice’s query cannot recall Bob’s private memory even when semantically similar |
| Shared promotion gate | Before confirmation Bob cannot retrieve the candidate fix; after confirmation and indexing he can |
| Cross-session private recall | A fresh browser or session for Carol retrieves prior environment and attempt context |
| Memory-off A/B | Compare endpoint includes no recalled memory and provenance arrays are empty |
| Correction precedence | A new explicit version or correction prevents an old value from being stated as current |
| Duplicate handling | Same blob or normalized text is injected once even if recall returns duplicate hits |
| Write failure | Failed Walrus call leaves a retryable job and never shows Stored |
| Redaction | Candidate containing email or token-like text cannot be promoted until sanitized |
| Three-by-ten evidence | Three tester accounts each show at least ten meaningful stored memories, if required by the current rules |
| No-memory baseline | Chat gives a useful answer with zero recalled memory |
| Provenance integrity | UI provenance is generated from actual recall results, not model prose |
| Resolution detection | A candidate shared fix is not generated solely because the assistant suggested a fix |

## Test-data rule

Use fictional or demo product and account details. Do not ask testers to provide real credentials, API keys, wallet keys, or sensitive customer information.

---

# 19. Build plan — deadline driven

## Operating principle

Do not spend the first day polishing a landing page.

The first milestone is:

> **Two users, two namespaces, one real Walrus write, one real recall, one answer that visibly changes.**

| Slice | What to build | Exit criteria |
|---|---|---|
| 0. Bootstrap — 60–90 min | Next.js app, environment validation, Walrus account/delegate setup, Gemini client, Neon schema, deploy skeleton | Production URL responds; secrets are server-side; Mainnet account is reachable |
| 1. Memory spine — 2–3 h | Private namespace, Remember and Recall wrappers, write status, raw diagnostic route | One tester fact writes to Mainnet and is recalled in a fresh session |
| 2. Chat loop — 2–3 h | Streaming or standard chat, private/shared parallel recall, provenance payload, thresholding, dedupe | Answer visibly cites used memory source and works with zero memory |
| 3. Promotion gate — 2 h | Resolution state, sanitized candidate fix, Save shared / Keep private, shared namespace write | Alice’s fix is promoted and retrievable from Bob’s account |
| 4. Compare and Evidence — 1.5–2 h | Memory-off compare, `/memory`, `/evidence`, counts, blob references | Judge can prove why memory changed the answer |
| 5. Real-user polish — 1–2 h | Access codes, responsive UI, error states, retry, short onboarding prompts | Three testers can use it without developer help |
| 6. Testing/data — continuous | Run three testers across multiple sessions; target 12–15 memories each | 3 × 10 minimum reached with screenshots and logs, if required |
| 7. Submission — final window | README, architecture image, article, video/screenshots, social post, form | All links public and verified; no hidden local dependency |

## Priority rule

If a later feature threatens the memory proof, drop the feature rather than weakening the proof.

---

# 20. Suggested calendar from the supplied build plan

The schedule below is the source plan and should be reconciled with the live competition deadline before execution.

| Window | Focus |
|---|---|
| October 7 — first block | Bootstrap, Walrus Mainnet smoke test, private recall; invite Tester 1 as soon as a stable loop exists |
| October 7 — second block | Chat/provenance and promotion gate; have Tester 1 create real memory while engineering continues |
| October 8 — morning | Shared recall, Compare without memory, retry states; invite Testers 2 and 3 |
| October 8 — afternoon/evening | Real usage and corrections; capture the Alice → Bob cross-user moment; fix only demo/evidence threats |
| October 9 — early | Fresh-session/device checks, memory counts, video/screenshots, README, and article |
| October 9 — buffer | Submit before the final hour; keep a stable deployed commit and avoid speculative refactors |

## Operational caveat

The live official submission form is the operational source for current deadline and schema. Reconfirm it before the final submission window.

---

# 21. Tester script — natural but deliberate

Use realistic scenarios, not fake one-line memory stuffing.

Each tester should have two or three mini support episodes that naturally create environment, issue, attempt, and resolution memories.

| Tester | Example episodes | Evidence to capture |
|---|---|---|
| Alice | CSV 422; notification issue; display preference | Private attempts plus promoted CSV fix |
| Bob | CSV 422 from a clean account; auth loop; export error | Shared fix retrieved from Alice and improved first diagnostic |
| Carol | Version-specific issue; return next session; correction to version | Cross-session private recall plus correction precedence |

## Tester instructions

- Ask testers to leave and return in a fresh tab or session.
- At least one tester should use another device if practical.
- Capture consented screenshots and logs only.
- Use fictional or demo product/account details.
- Do not force exactly ten tiny facts.
- Aim for twelve to fifteen meaningful memories so a failed or duplicate write does not jeopardize the minimum.
- Record whether a memory was pending, saving, stored, or failed.
- Record the first time a stored memory is recalled.

---

# 22. Definition of done

- Live URL works on mobile and desktop.
- Walrus Memory Mainnet account and delegate are configured.
- Real writes and recalls are proven.
- Private namespaces are server-derived and isolated.
- A shared fix is impossible to write without confirmation.
- At least one shared fix changes a different user’s answer.
- Compare without memory works and is captured.
- Three real testers have ten or more meaningful stored memories each, if current rules require it.
- Evidence page shows counts, status, and blob references without exposing private text.
- Public GitHub repository includes README, architecture, setup, environment example, known friction, and reproducible run instructions.
- Article and social post are drafted from actual captured behaviour, not imagined claims.
- No real credentials, private keys, access codes, or sensitive account data appear in the repository or evidence.

---

# 23. Fallback plan

| Risk | Fallback |
|---|---|
| Shared-memory promotion becomes unstable | Keep the same product but make promotion a reviewer-only button on `/evidence`; the cross-user thesis still holds |
| Streaming complicates delivery | Use normal request/response chat; memory proof matters more than streaming |
| Neon integration costs time | Use a minimal development-only SQLite or file store, but production still needs stable server-side metadata; long-term memory remains in Walrus |
| Write latency is severe | Prioritize fewer, higher-quality memory events; show honest Saving states; preload tester sessions earlier |
| Recall is noisy | Tighten distance threshold, query with structured symptom context, and lower `topK` before changing the UI |
| Product polish is behind | Ship one excellent chat screen plus provenance and promotion card; drop secondary pages before dropping the memory experiment |

## Non-negotiable fallback invariant

> **The shared memory must remain more trustworthy than the model. If a fix cannot be traced to a confirmed resolution, it does not belong in the shared namespace.**

---

# 24. Post-hackathon roadmap

These items are roadmap, not MVP commitments:

- integrate existing helpdesk channels;
- import resolved-ticket knowledge with explicit review;
- add organization/workspace ownership and scoped reviewer roles;
- build temporal validity and stale-fix review;
- add version-aware supersession on top of append-only memory;
- measure resolution steps saved, repeat-contact reduction, fix reuse, and confidence;
- allow organizations to carry accumulated support memory across chat vendors;
- add richer memory-quality analytics;
- support larger product and troubleshooting knowledge bases after the core memory loop is reliable.

## Product invariant

> **The shared memory must remain more trustworthy than the model.**

---

# 25. Reference links and build inputs

- Walrus Memory documentation: https://docs.wal.app/walrus-memory
- Walrus Memory repository: https://github.com/MystenLabs/MemWal
- Walrus Memory chatbot example: https://docs.wal.app/walrus-memory/examples/chatbot
- Walrus Memory product page: https://www.walrus.xyz/products/walrus-memory
- Walrus Memory introduction: https://blog.walrus.xyz/how-to-add-portable-memory-to-claude-code-and-codex-with-walrus-memory/
- Walrus Sessions official site: https://thewalrussessions.wal.app/
- Walrus Session 8 submission form: https://airtable.com/appoDAKpC74UOqoDa/shro5iVzzjoWfZlPK
- Builder companion submission surface linked by the official form: https://www.deepsurge.xyz/hackathons/c0141a4a-21be-4009-bc63-7c168608c849

The supplied source brief also reviewed public Session 8 repositories and examples including Hippo, SuiHub Mentor, WalCoach, DoseDaughter, Memorable, Memoranda, and People Book. Treat those as strategic discovery inputs rather than official requirements.

## Final implementation rule

> **Do not call Meros memory-native because it stores a few chat messages. Call it memory-native when memory is durable, correctly scoped, visibly recalled, and demonstrably changes the next support action.**

---

## Sources

- Walrus Memory documentation: https://docs.wal.app/walrus-memory
- Walrus Memory repository: https://github.com/MystenLabs/MemWal
- Walrus Memory chatbot example: https://docs.wal.app/walrus-memory/examples/chatbot
- Walrus Memory product page: https://www.walrus.xyz/products/walrus-memory
- Walrus Memory introduction: https://blog.walrus.xyz/how-to-add-portable-memory-to-claude-code-and-codex-with-walrus-memory/
- Walrus Sessions official site: https://thewalrussessions.wal.app/
- Walrus Session 8 submission form: https://airtable.com/appoDAKpC74UOqoDa/shro5iVzzjoWfZlPK
- Builder companion submission surface linked by the official form: https://www.deepsurge.xyz/hackathons/c0141a4a-21be-4009-bc63-7c168608c849

This Markdown file is an editable replacement derived from the supplied PDF. The PDF itself remains unchanged. Competition dates, rubric details, and submission requirements must be rechecked in the live official submission flow.
