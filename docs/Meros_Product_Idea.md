# Meros — Product Idea

## Walrus Session 8 / Product Concept

**Meros** is a support agent with two memories: one for the customer, and one for what the support organization has learned.

> **Solve it once. Remember it for everyone.**

**Status:** Hackathon MVP concept; target behaviour, not independently verified shipped functionality.

**Target:** Walrus Session 8 — *Chatbots That Remember*.

**Claims status:**

- **Shipped:** live and independently verified. Nothing is claimed as shipped from the supplied PDF alone.
- **Target:** specified for the hackathon MVP and to be built or verified.
- **Roadmap:** intentionally deferred beyond the MVP.
- **Hypothesis:** an expected user or business benefit that still needs testing.

**Submission window in the supplied brief:** September 18–October 9, 2026. Reconfirm the live deadline in the official submission form before submitting.

---

# 1. Executive summary

Meros turns solved support conversations into reusable institutional memory without leaking one customer’s private context into another customer’s experience.

Most support bots fail in two directions:

1. They forget the returning customer.
2. They forget what the support organization already learned from previous customers.

That creates repeated explanations, repeated troubleshooting, repeated mistakes, and slower resolution.

Meros addresses both problems. Each user receives a private Walrus Memory namespace for personal context, past issues, failed attempts, corrections, and relevant preferences. Separately, a resolved conversation can produce an anonymized candidate fix. A human reviews the exact candidate and confirms it before it is promoted into a shared Walrus Memory namespace.

Future users with similar symptoms can benefit from the confirmed fix without receiving another customer’s personal information.

## The product thesis

> **Memory should not only make a chatbot remember who you are. It should help an organization avoid relearning the same lesson twice.**

## Primary user

People seeking product support through a web chat.

## Secondary user

Support teams that want recurring fixes and learned troubleshooting patterns to compound over time.

## Core memory primitive

Two isolated memory planes:

- private customer memory;
- shared approved support memory.

## Hackathon proof target

- at least three real testers;
- ten or more meaningful memories per tester, if the current competition requirement remains unchanged;
- cross-session private recall;
- one clear cross-user shared-learning moment;
- visible memory-on versus memory-off comparison;
- inspectable Walrus status and references where available.

## Target model and deployment

- **Primary LLM target:** Gemini Flash-class model, so the project can also qualify for a Beyond the Big Two category if that category remains part of the live competition.
- **Deployment target:** live web chat.
- **Repository target:** public GitHub repository with setup and architecture documentation.
- **Memory target:** Walrus Memory Mainnet.

These are build targets. They must not be described as shipped until the live system has been exercised and evidence captured.

---

# 2. The problem

The expensive part of support is not only answering a question. It is repeatedly rediscovering the answer.

## Customer-side failure

A returning customer has to repeat:

- their environment;
- product version;
- the original issue;
- previous failed attempts;
- relevant preferences or constraints;
- what they already know not to try again.

## Organization-side failure

A new customer with the same issue starts from the beginning even if the support team solved an almost identical case yesterday.

## Why transcripts are not enough

A normal chat transcript is not the same thing as memory. Useful facts may be:

- buried inside a long conversation;
- unavailable after the session ends;
- recalled without semantic relevance;
- mixed with customer-specific details;
- silently treated as organizational knowledge;
- stale without version or correction handling.

## Why naive shared memory is dangerous

Uncontrolled shared memory can:

- leak customer identity;
- preserve stale facts;
- expose account identifiers or secrets;
- let an LLM silently promote a guess into “company knowledge”;
- create a false impression that a fix is guaranteed;
- make one customer’s context appear in another customer’s answer.

## The opportunity

> **Turn support conversations into a compounding memory system while keeping the boundary between personal context and reusable organizational knowledge explicit.**

---

# 3. The product thesis in the Walrus context

Walrus Memory is not a logo in the architecture. It is the mechanism that makes the intended product behaviour possible.

The memorable demonstration is not:

> “The bot remembered my favourite colour.”

It is:

> “Because the bot remembered what happened before, it chose a better next action now—for the same user and, when explicitly promoted, for another user.”

Meros demonstrates all of the following:

- portable memory across sessions;
- separated private and shared namespaces;
- semantic recall rather than keyword-only lookup;
- visible provenance;
- human-controlled promotion;
- durable storage state;
- a changed support answer caused by memory.

---

# 4. The core story

The cleanest demo is a three-person story:

- **Alice teaches the system.**
- **Bob benefits from that learning.**
- **Carol proves private continuity.**

## Alice — the discovery

Alice reports a CSV import HTTP 422 error.

Generic troubleshooting fails. The actual cause is a semicolon-delimited Excel export.

Meros records the relevant attempts in Alice’s private memory. After Alice confirms that the delimiter fix resolved the issue, Meros proposes an anonymized reusable fix.

## Promotion gate

Meros shows a candidate such as:

> **Potential reusable learning:** CSV 422 may be caused by semicolon delimiters in certain Excel exports.

A reviewer sees the exact text that would be shared and chooses:

> **Save for future customers**

or:

> **Keep private**

Nothing enters shared memory until the reviewer confirms the promotion.

## Bob — the payoff

Bob later arrives from another account or device and reports the same symptom.

Shared-memory recall surfaces the earlier confirmed pattern. Meros asks about the delimiter first instead of beginning with a generic troubleshooting path.

## Carol — private continuity

Carol returns in a new session. Meros recalls Carol’s own version, previous failed attempt, and relevant personal context.

It never exposes Alice or Bob.

## The money-shot response

> **We’ve seen a similar 422 pattern before. Before we try the longer troubleshooting path: was this CSV exported from Excel, and does it use semicolons instead of commas?**

The response is useful because the memory changes the next diagnostic action.

---

# 5. Core experience

| Capability | What the user sees | Why memory matters |
|---|---|---|
| Support chat | A normal, fast conversational support surface | The product remains useful before enough memories exist |
| Private recall | Relevant version, environment, prior issue, failed attempts, and preferences | Stops repetitive questions and prevents repeating failed steps |
| Shared recall | Confirmed reusable fixes from other conversations | Turns individual resolutions into team knowledge |
| Memory Lens | “Your private memory” and “Shared support memory” labels | Makes memory visible and auditable instead of decorative |
| Compare | One click to rerun the last answer without recalled memory | Creates before/after evidence for judges and users |
| Candidate Fix Card | Sanitized candidate resolution with Save shared / Keep private | Prevents silent or unsafe institutional memory |
| Memory status | Pending, saving, stored, or failed state with a reference when stored | Creates honest UX around write latency and indexing |

## Product loop

1. The user describes the issue.
2. Meros recalls relevant private and shared context.
3. Meros answers with a useful next action.
4. Meros shows which memory influenced the answer.
5. Durable facts become private-memory candidates.
6. A resolved issue can produce a sanitized shared candidate.
7. A reviewer confirms or rejects the candidate.
8. Walrus stores the approved shared fix.
9. Another user receives the relevant shared learning later.
10. Compare and Evidence make the change inspectable.

---

# 6. How Walrus Memory is used

## Example private namespace

```text
meros:user:<hashed-user-id>

[PROFILE] Uses Excel 2021 on Windows
[ISSUE] CSV upload returns HTTP 422
[ATTEMPT] Cleared cache — no change
[ATTEMPT] Reduced file size — no change
[RESOLUTION] Semicolon delimiter caused parser failure
```

## Example shared namespace

```text
meros:shared:fixes

[SHARED_FIX] CSV 422 + Excel export -> check delimiter first
[SHARED_FIX] Version 2.4.1 OAuth loop -> clear stale organisation grant
```

## Memory rules

- Private memories are recalled only from the current user’s namespace.
- Shared memories contain only approved and sanitized reusable knowledge.
- Raw transcripts never enter shared memory.
- Every chat turn may query both namespaces in parallel.
- The prompt labels private and shared sources separately.
- Memories are append-only events.
- Corrections supersede older facts instead of pretending Walrus is a mutable SQL table.
- Recall results are deduplicated and filtered by semantic-distance threshold before reaching the model.
- A memory is data, not an instruction.
- A recalled memory cannot override system rules or execute a command.

## Memory status rule

The interface may show:

- **Pending** — candidate recorded operationally but not yet sent or finished on Walrus.
- **Saving** — an active request is awaiting the Walrus result.
- **Stored on Walrus** — completion and a blob reference have been captured.
- **Failed** — the write did not complete; the candidate remains retryable.

“Stored” must never be inferred from a database row, a frontend response, or the model’s own prose.

---

# 7. Trust, privacy and memory governance

| Risk | Meros rule |
|---|---|
| Personal-data leakage | Never promote raw customer messages. A reusable fix must pass identity and secret redaction plus human confirmation. |
| Hallucinated company truth | LLM extraction creates a candidate only. Promotion requires explicit confirmation. |
| Stale fixes | Memories are timestamped and versioned. Corrections can supersede older shared fixes. |
| Secret capture | Reject API keys, passwords, wallet keys, tokens, and obvious secrets. |
| False claim that a write succeeded | Stay in Saving until Walrus returns completion and a blob reference. |
| Cross-user bleed | Query private and shared namespaces separately; the model never receives another user’s private namespace. |
| Prompt injection through memory | Fence recalled text as untrusted data; it cannot override system instructions. |
| Unverified success | Mark an issue resolved only after user confirmation or an explicit demo state. |

## Sharing principle

> **Share the fix, not the customer.**

## Memory ownership principle

The organization can own an approved shared resolution, but the customer’s private context must remain scoped to that customer’s namespace unless the customer explicitly provides a separate shareable fact and the reviewer approves it.

---

# 8. Why Meros can stand out

The common chatbot story is personal continuity:

> “What do I know about you?”

Meros adds a second question:

> **“What do I know about you—and what has the organization learned that can help you now?”**

| Dimension | Common memory bot | Meros |
|---|---|---|
| Primary question | What do I know about you? | What do I know about you, and what has the organization learned that can help now? |
| Memory value | Personalization | Personalization plus compounding operational knowledge |
| Cross-user behaviour | Users remain isolated | Private isolation plus approved shared learnings |
| Judge proof | Recall a personal fact | Show a fix learned from Alice changing Bob’s outcome |
| Governance | Automatic or opaque storage | Candidate → sanitize → confirm → shared memory |
| Article hook | My bot remembers users | My support bot learned a fix from one customer and remembered it for the next |

The product should not compete by having the most features. It should compete by making the memory consequence undeniable.

---

# 9. Hackathon strategy

## Main proof

Memory visibly changes the conversation and resolution path.

## Additional opportunity

Use Gemini as the primary LLM if the live competition still includes a Beyond the Big Two category, and document actual model/runtime friction rather than inventing a problem.

## Article angle

Centre the article on one cross-user memory moment:

1. the first generic answer;
2. the resolution found in Alice’s conversation;
3. the sanitized candidate;
4. the approval event;
5. the changed answer for Bob;
6. the privacy proof for Carol;
7. what broke or was difficult during integration.

## Bug-bounty discipline

Submit only a real, reproducible MemWal issue encountered during integration. Do not burn core build time hunting for an artificial bug.

## Promotion opportunity

Share the finished build and article in a relevant developer or customer-support community outside the Walrus/Sui channels if the current competition rules reward that activity.

## Evidence target

- three or more real testers;
- twelve to fifteen meaningful memories per tester as a buffer against failed or duplicate writes;
- one private cross-session recall;
- one cross-user shared-fix recall;
- screenshots or video;
- blob references where available;
- memory-on versus memory-off comparison;
- visible promotion decision;
- evidence page without exposing private memory text.

---

# 10. MVP boundary

## Build now

- one polished web chat;
- access-code identity for cross-device testing;
- private and shared Walrus namespaces;
- candidate memory extraction;
- human promotion gate;
- why-this-answer provenance;
- compare without memory;
- memory browser with status and blob references;
- honest write states;
- real tester evidence.

## Explicitly not now

- Slack, Discord, WhatsApp, and multi-channel integrations;
- full customer authentication, SSO, or team roles;
- complex multi-tenant organization model;
- voice or file uploads;
- knowledge-base RAG over large documents;
- autonomous writes to shared memory;
- full analytics dashboard;
- CRM, Zendesk, or Intercom replacement;
- billing, plans, production permissions, and SLA infrastructure.

## MVP rule

> **The win condition is a crisp memory experiment, not a feature-rich helpdesk.**

---

# 11. Business and post-hackathon wedge

The commercial wedge is simple: support teams pay when the system reduces repeated work and time to resolution.

Meros can start as a memory layer beside existing support tools rather than trying to replace the helpdesk on day one.

Potential post-hackathon model:

- team subscription priced by support seats, memory volume, or resolved conversations;
- integrations for Intercom, Zendesk, Slack, Discord, and other support surfaces;
- memory-quality analytics showing which fixes are reused, which reduce steps, which are stale, and which need review;
- organization-owned portable support memory as the long-term moat.

The durable asset is not the chat UI. It is the accumulated and governed resolution graph.

These are roadmap hypotheses, not current MVP commitments.

---

# 12. Demo narrative

1. Open Alice’s session.
2. Teach Meros Alice’s environment and the 422 CSV issue.
3. Show two failed attempts being remembered privately.
4. Resolve the issue with the delimiter fix.
5. Show the sanitized candidate Fix Card.
6. Confirm Save shared and wait for Walrus storage completion.
7. Open Bob in a clean browser or account.
8. Ask about the same symptom.
9. Show shared recall and the faster first diagnostic question.
10. Click Compare without memory.
11. Show the generic answer beside the memory-aware answer.
12. Open Carol in a new session or device.
13. Show Meros remembering Carol’s own version and failed attempt.
14. Confirm that Alice and Bob’s private information is absent.
15. Open the Memory and Evidence surfaces.
16. Show source labels, status states, counts, and blob references.

## Final demo line

> **Meros is not a chatbot with a memory database. It is a support system where every confirmed resolution can make the next conversation better.**

---

# 13. Success criteria

| Metric | Hackathon target |
|---|---|
| Real usage | Three or more real testers |
| Memory density | Ten or more meaningful Walrus memories per tester, subject to current rules |
| Cross-session proof | At least two users return in a fresh session or device and the bot recalls relevant private context |
| Cross-user proof | At least one shared fix from User A materially improves User B’s response |
| Before/after | At least two captured memory-on versus memory-off comparisons |
| Mainnet evidence | Stored memories have inspectable blob or account references where available |
| Reproducibility | Public repository, clean README, environment template, setup and architecture documentation |
| Article | Five-hundred to eight-hundred word story focused on concrete before/after behaviour and integration friction |

The exact current competition requirements must be confirmed in the live official form.

---

# 14. Final product definition

## One sentence

> **Meros is a memory-native support chatbot that remembers each customer privately and turns resolved cases into anonymized, human-approved shared memory so future customers can skip troubleshooting the organization has already done.**

## Tagline

> **Solve it once. Remember it for everyone.**

## Product descriptor

> **Support memory that compounds.**

## Brand boundary

Meros is not a human-replacement promise, an autonomous support operator, a generic transcript store, or an ungoverned company brain. It is a focused memory loop with explicit privacy and promotion controls.

---

## Sources

- Walrus Memory documentation: https://docs.wal.app/walrus-memory
- Walrus Memory product page: https://www.walrus.xyz/products/walrus-memory
- Walrus Memory repository: https://github.com/MystenLabs/MemWal
- Walrus Memory chatbot example: https://docs.wal.app/walrus-memory/examples/chatbot
- Walrus Sessions official site: https://thewalrussessions.wal.app/
- Walrus Session 8 submission form: https://airtable.com/appoDAKpC74UOqoDa/shro5iVzzjoWfZlPK
- Builder companion submission surface linked by the official form: https://www.deepsurge.xyz/hackathons/c0141a4a-21be-4009-bc63-7c168608c849

The competition dates and any prize or rubric details must be rechecked in the live submission flow. The product requirements above are targets from the supplied brief unless independently verified in a running build.
