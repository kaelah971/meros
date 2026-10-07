# Meros — Brand Messaging

## Purpose

This document turns the messaging-relevant material from `Meros_Seven_Things_Brand_and_Product_Scope.md` into a focused, build-ready messaging system for **Meros**.

It defines:

- what Meros means;
- who it is for;
- the problem it owns;
- the promise it makes;
- the messages it should repeat;
- how those messages change by audience and product moment;
- how the product should speak about memory, privacy, evidence, and uncertainty;
- the copy required for the landing page and core product flow;
- the claims Meros may and may not make.

This is a messaging and language document. Visual identity, detailed system architecture, and competition execution belong in the companion scope and PRD documents.

## Source and status discipline

The strategic source is `Meros_Seven_Things_Brand_and_Product_Scope.md`, supported by the supplied product idea and PRD/architecture documents.

The supplied material describes a hackathon MVP concept and build target. Unless separately verified in a live product:

- **Shipped** means live and independently tested.
- **Target** means specified for the MVP and still to be built or verified.
- **Roadmap** means intentionally deferred.
- **Hypothesis** means a strategic belief that requires user testing.

Meros must not use polished language to make a target capability sound shipped.

---

# 1. Messaging foundation

## 1.1 Master brand

> **Meros**

**Pronunciation:** MEH-ros

**Brand meaning:** a part, share, or portion that becomes useful within a larger whole.

The name supports the product idea that every resolved support conversation can contribute a valuable part to the organization’s accumulated memory—while a customer’s private context remains separate.

## 1.2 Public category

> **Memory-native support chatbot**

This is the clearest category because it tells the audience:

- what Meros is;
- what makes it different;
- why memory matters;
- why the product is not simply another helpdesk interface.

## 1.3 Technical category

> **Human-governed, dual-plane agent memory for support workflows**

Use this in technical documentation, architecture explanations, and hackathon evidence. Do not lead the public homepage with it.

## 1.4 Primary descriptor

> **Support memory that compounds.**

## 1.5 Product line

> **Solve it once. Remember it for everyone.**

This is the strongest operational expression of the product. It contains both sides of the value:

- the support team should not rediscover the same solution repeatedly;
- future customers should benefit from the approved learning;
- private customer information should not be shared as part of that benefit.

## 1.6 Core message

> **Meros turns solved support conversations into reusable memory without turning one customer’s private context into another customer’s data.**

## 1.7 One-line description

> **Meros is a support chatbot that remembers each customer privately and lets approved fixes help the next customer.**

## 1.8 Shortest useful explanation

> **It remembers the customer, preserves the lesson, and shares only what has been approved.**

## 1.9 Product boundary

Meros is not:

- a generic chatbot with a transcript database;
- an autonomous support employee;
- an ungoverned company brain;
- a replacement for a full helpdesk in the MVP;
- a system that automatically turns every conversation into shared knowledge;
- a product that exposes one customer’s private context to another customer.

Meros is:

- private customer continuity;
- approved shared support learning;
- visible memory provenance;
- evidence-backed improvement in the next answer.

---

# 2. Positioning and value proposition

## 2.1 Primary audience

### Customers seeking support

People who want a fast, useful answer without repeating:

- their product version;
- their environment;
- the original issue;
- troubleshooting steps that already failed;
- relevant preferences or constraints.

### Support reviewers and teams

Support operators who want useful resolutions to become reusable knowledge without exposing:

- names;
- emails;
- account identifiers;
- credentials;
- raw transcripts;
- customer-specific assumptions.

### Technical and hackathon audience

Judges and developers who need to see:

- what is stored;
- where it is stored;
- which namespace is recalled;
- how memory changes an answer;
- why private context does not leak;
- how a shared fix becomes eligible for recall.

## 2.2 Audience insight

Support has a memory problem in two directions:

1. The returning customer is forced to repeat what the system already knew.
2. The support organization is forced to rediscover what it already learned.

A transcript is not automatically memory. Useful facts may remain buried, disappear after a session, be recalled without relevance, or be promoted without privacy and accuracy controls.

## 2.3 Core problem

> **The expensive part of support is not only answering a question. It is repeatedly rediscovering the answer.**

## 2.4 Functional job

> When I return with a problem, remember what you already know about my setup and what we already tried so I do not repeat myself.

## 2.5 Organizational job

> When a problem has been solved once, turn the useful part of that resolution into approved knowledge so the next customer does not start at step zero.

## 2.6 Emotional job

> Let me feel recognised and helped without making me wonder whether my personal information has been shared.

## 2.7 Social and identity job

For a support team:

> Help us become an organization that learns from its work instead of repeatedly starting over.

For a customer:

> Treat my history as useful context, not as something I have to explain from scratch every time.

## 2.8 Primary promise

> **Meros remembers the customer privately and helps the support team remember the lesson publicly—only when it has been sanitized and approved.**

## 2.9 Differentiated mechanism

Meros connects five behaviours:

1. **Private continuity** — the same customer can return with relevant context.
2. **Shared learning** — a resolved case can generate a reusable candidate fix.
3. **Promotion control** — a human approves what enters shared memory.
4. **Visible provenance** — users can see whether an answer used private or shared memory.
5. **Before/after proof** — the same question can be rerun without memory to show what changed.

## 2.10 Reason to believe

The MVP target supports the promise through:

- separate Walrus namespaces;
- server-derived user identity;
- semantic recall by issue context;
- private/shared source labels;
- candidate extraction;
- identity and secret redaction;
- Save shared / Keep private actions;
- append-only memory records;
- correction and supersession handling;
- pending, saving, stored, and failed write states;
- memory-off comparison;
- evidence counts and blob references.

These are reasons to believe only when the corresponding functionality is live and evidenced.

## 2.11 Emotional payoff

For the customer:

> **I do not have to start over every time I ask for help.**

For the support team:

> **The work we already did can make the next answer better.**

For the judge:

> **The memory is visible, governed, and connected to a changed conversation.**

## 2.12 Strategic enemy

### Primary enemy

> **Support amnesia.**

### Supporting enemies

- repeated explanations;
- repeated failed troubleshooting;
- raw transcript hoarding;
- anonymous knowledge without provenance;
- silent promotion of guesses;
- customer-context leakage;
- stale fixes presented as current truth;
- memory claims with no proof of storage.

## 2.13 Positioning statement

> **For product customers and support teams who are tired of repeating solved work, Meros is a memory-native support chatbot that keeps each customer’s context private while turning confirmed resolutions into reusable organizational memory. Unlike ordinary chatbots and transcript search, Meros shows which memory changed the answer and requires human approval before a fix is shared.**

## 2.14 Message-layer test

Meros messaging must pass these layers in order:

### Clarity — What is it?

> A support chatbot with private and shared memory.

### Relevance — Is it for me?

> For customers who are tired of repeating themselves and support teams tired of rediscovering solved fixes.

### Value — What do I get?

> A more continuous support experience and a better first answer for recurring issues.

### Differentiation — Why Meros?

> It keeps customer context private, promotes only approved shared fixes, and shows how memory changed the answer.

If someone does not understand the category, do not lead with infrastructure, decentralization, or AI sophistication.

---

# 3. Messaging house

## Roof: the message to remember

> **Support gets better when it remembers the right things.**

## Pillar 1 — Remember the customer

### Message

> Meros carries relevant setup, issue, attempt, and correction context across sessions.

### Customer benefit

Returning customers spend less time repeating themselves and less time retrying failed steps.

### Proof points

- private per-user namespace;
- fresh-session recall;
- server-derived identity;
- correction precedence;
- source labels;
- relevant context shown beside the answer.

### Primary copy

> **Come back without starting over.**

### Supporting copy

> Meros remembers the context that helps support move forward—your environment, the issue, and what has already failed.

## Pillar 2 — Remember the lesson

### Message

> A resolved issue can produce a sanitized candidate fix that is useful beyond the original conversation.

### Support-team benefit

Future customers can reach the right diagnostic path faster.

### Proof points

- candidate Fix Card;
- source issue;
- redaction status;
- reviewer approval;
- shared namespace;
- successful Walrus write.

### Primary copy

> **A solved problem should not disappear with the chat.**

### Supporting copy

> When a resolution is genuinely useful beyond one customer, Meros can prepare it for review instead of letting the lesson vanish with the session.

## Pillar 3 — Share carefully

### Message

> Shared memory is not an automatic dump of conversations. It is a governed promotion path.

### Support-team benefit

The organization can compound knowledge without casually exposing personal information.

### Proof points

- exact candidate text shown before sharing;
- identity and secret redaction;
- Save shared / Keep private controls;
- no autonomous shared writes;
- versioning and correction handling.

### Primary copy

> **Share the fix. Keep the customer private.**

### Supporting copy

> The reusable lesson can travel. The customer’s private context does not.

## Pillar 4 — Show the difference

### Message

> Meros makes memory’s effect visible instead of decorating the interface with a memory claim.

### User and judge benefit

They can see why the answer changed and verify that memory contributed something real.

### Proof points

- Memory Lens;
- private/shared provenance chips;
- Compare without memory;
- used blob references;
- memory-on versus memory-off outputs;
- evidence counts and status.

### Primary copy

> **See what Meros remembered—and why it mattered.**

### Supporting copy

> The product should not ask people to trust a badge that says “memory used.” It should show the source and the changed next action.

## Foundation

> **Personal by default. Shared by permission. Useful over impressive. Evidence over confidence.**

---

# 4. Core message system

## 4.1 Brand line

> **Support memory that compounds.**

Job: describe the long-term benefit in a compact, ownable way.

## 4.2 Product line

> **Solve it once. Remember it for everyone.**

Job: explain the operational loop and the cross-user payoff.

## 4.3 Human benefit line

> **Come back without starting over.**

Job: make private continuity immediately understandable to customers.

## 4.4 Governance line

> **Share the fix. Keep the customer private.**

Job: make the privacy boundary memorable to support teams and judges.

## 4.5 Proof line

> **See what Meros remembered—and why it mattered.**

Job: make provenance and comparison central to trust.

## 4.6 Campaign line

> **A solved problem should not disappear with the chat.**

Job: create emotional tension around organizational forgetting.

## 4.7 Recommended homepage combination

Use one lead line and one supporting line. Do not stack every slogan at once.

**Recommended combination:**

> **Solve it once. Remember it for everyone.**
>
> Meros remembers each customer’s setup and previous attempts privately, then turns confirmed, sanitized fixes into shared support memory. The next customer gets a better first question without seeing anyone else’s history.

---

# 5. Message hierarchy by audience

## 5.1 Five-second explanation

> **Meros is a support chatbot that remembers the right things.**

## 5.2 Ten-second explanation

> **It remembers each customer privately and lets approved support fixes help the next customer.**

## 5.3 Fifteen-second pitch

> **Meros is a support chatbot with two memories: one for the customer and one for what the support organization has learned. It remembers personal context across sessions, promotes only sanitized and approved fixes into shared memory, and shows how that memory changes the next answer.**

## 5.4 Thirty-second pitch

> **Most support bots forget returning customers, while support teams repeatedly rediscover fixes they already found. Meros separates those problems. It keeps each customer’s environment, issue history, and failed attempts in a private Walrus namespace. After a case is resolved, it can propose a sanitized reusable fix for human approval. A future customer can then benefit from the shared learning without receiving the original customer’s private context. Meros makes the memory source visible and offers a memory-off comparison so the improvement can be verified.**

## 5.5 Sixty-second narrative

> Support has a memory problem in two directions. Customers return and have to explain their environment again. Support teams solve a recurring issue and then rediscover the same fix later.
>
> Meros gives the system two deliberately separated memories. The customer’s environment, previous issue, and failed attempts stay in private memory. When a case is resolved, Meros can prepare a sanitized candidate fix. A human reviews the exact text before it enters shared support memory.
>
> The next customer can benefit from that confirmed learning without seeing the first customer’s history. Meros shows which memory influenced the answer, and a memory-off comparison makes the difference visible.
>
> It does not simply remember more. It remembers with boundaries, and it makes the next support action better.

## 5.6 Judge-facing narrative

> Alice teaches Meros that a CSV 422 issue came from a semicolon-delimited Excel export. Meros remembers Alice’s attempts privately and prepares a sanitized Fix Card. A reviewer approves it. Bob later reports the same symptom from a clean account; shared memory makes the delimiter the first diagnostic question. Carol returns in a new session, and Meros remembers only Carol’s own version and failed attempt. One product demonstrates personal continuity, collective learning, privacy boundaries, and a visible change in the answer.

## 5.7 Article hook

> **A support bot learned a fix from one customer and remembered the lesson for the next—without sharing the customer.**

---

# 6. Segment-specific messaging

## 6.1 Customer seeking support

### Problem

> I already explained this once. Why am I explaining it again?

### Message

> **Come back without starting over.**

### Supporting copy

> Meros remembers relevant details about your setup, the issue you reported, and the steps that already failed so the next conversation can begin closer to the solution.

### CTA

> **Continue my support conversation**

## 6.2 New customer with a recurring issue

### Problem

> I do not want to repeat a troubleshooting path that already failed for someone else.

### Message

> **Start with what has already worked.**

### Supporting copy

> When a confirmed shared fix matches your symptoms, Meros checks that path first instead of blindly repeating generic troubleshooting.

### CTA

> **Check the confirmed fix**

## 6.3 Support reviewer

### Problem

> We solve the same issue repeatedly, but sharing raw conversations would create privacy and trust problems.

### Message

> **Share the fix, not the customer.**

### Supporting copy

> Meros prepares a sanitized candidate from a resolved case. You review the exact text before anything enters shared memory.

### CTA

> **Review the Fix Card**

## 6.4 Support leader

### Problem

> Valuable support work disappears when the conversation ends.

### Message

> **Turn resolved work into reusable support memory.**

### Supporting copy

> Meros helps the organization compound its troubleshooting knowledge without replacing the existing helpdesk in the first step.

### CTA

> **See how support memory compounds**

## 6.5 Technical judge or developer

### Problem

> Many products claim memory without showing what was stored, recalled, or changed.

### Message

> **Two isolated memory planes. One visible change in the answer.**

### Supporting copy

> Meros separates private customer memory from approved shared support memory, exposes provenance, and provides a memory-off comparison.

### CTA

> **Inspect the evidence**

---

# 7. Feature-to-value messaging

## 7.1 Private memory

**Feature:** per-user Walrus namespace.

**Functional result:** personal context survives a session boundary.

**Practical outcome:** fewer repeated questions and failed steps.

**Emotional meaning:** the customer feels recognised rather than reset.

**Copy:**

> **Your setup, your history, your private context—ready when you return.**

## 7.2 Shared memory

**Feature:** approved shared namespace.

**Functional result:** reusable resolutions travel across users.

**Practical outcome:** recurring issues start closer to the cause.

**Emotional meaning:** the support organization feels like it is learning.

**Copy:**

> **The next customer should not start at step zero if the team already solved the problem.**

## 7.3 Candidate Fix Card

**Feature:** sanitized candidate resolution.

**Functional result:** the reviewer can inspect exactly what might be shared.

**Practical outcome:** a resolution can become reusable without exposing the source customer.

**Emotional meaning:** sharing feels deliberate rather than risky.

**Copy:**

> **Potential reusable fix. Review the exact text before sharing it.**

## 7.4 Promotion gate

**Feature:** Save shared / Keep private decision.

**Functional result:** a model suggestion cannot silently become organizational knowledge.

**Practical outcome:** shared memory stays governed.

**Emotional meaning:** the organization retains authority over what it learns publicly.

**Copy:**

> **You decide whether this lesson travels.**

## 7.5 Memory Lens

**Feature:** private/shared provenance panel.

**Functional result:** the user can inspect the context behind an answer.

**Practical outcome:** memory’s contribution is demonstrable.

**Emotional meaning:** the system feels accountable rather than magical.

**Copy:**

> **Here is what Meros used—and where it came from.**

## 7.6 Compare without memory

**Feature:** rerun the same request without recalled memory.

**Functional result:** memory-on and memory-off answers can be compared.

**Practical outcome:** the demo proves that memory changed behaviour.

**Emotional meaning:** the product earns trust through evidence.

**Copy:**

> **Same request. No recalled memory. See what changed.**

## 7.7 Honest write states

**Feature:** pending, saving, stored, and failed states.

**Functional result:** the interface reflects actual persistence.

**Practical outcome:** users do not mistake a queued request for durable memory.

**Emotional meaning:** Meros does not pretend.

**Copy:**

> **Stored means Walrus completion—not a hopeful spinner.**

## 7.8 Evidence page

**Feature:** counts, references, statuses, and comparison records.

**Functional result:** the system’s memory loop can be inspected.

**Practical outcome:** judges and developers can reproduce the claim.

**Emotional meaning:** the product is willing to show its work.

**Copy:**

> **If memory changed the answer, you should be able to see the evidence.**

---

# 8. Landing-page messaging and copy

## 8.1 Hero

### Eyebrow

> WALRUS MEMORY FOR SUPPORT CONVERSATIONS

### Headline

> **Solve it once. Remember it for everyone.**

### Supporting paragraph

> **Meros remembers each customer’s setup and previous attempts privately, then turns confirmed, sanitized fixes into shared support memory. The next customer gets a better first question without seeing anyone else’s history.**

### Primary CTA

> **Try the memory loop**

### Secondary CTA

> **See what changed**

### Trust line

> **Private context stays private. Shared fixes require confirmation. Stored means Walrus completion—not a hopeful spinner.**

## 8.2 Problem section

### Heading

> **Support forgets in two directions.**

### Body

> Customers repeat themselves. Teams rediscover solved fixes. A transcript may contain the answer, but it does not automatically carry the right context into the next conversation.

## 8.3 Private memory section

### Heading

> **Come back without starting over.**

### Body

> Meros remembers relevant details about your environment, issue, and previous attempts in your private memory. The next session can begin with context instead of another round of the same questions.

## 8.4 Shared memory section

### Heading

> **A solved problem should not disappear with the chat.**

### Body

> When a resolution may help future customers, Meros prepares a sanitized candidate fix. A reviewer decides whether it enters shared support memory.

## 8.5 Privacy section

### Heading

> **Share the fix. Keep the customer private.**

### Body

> Shared memory is not a transcript dump. Names, account details, credentials, and customer-specific context stay out of the shared namespace.

## 8.6 Evidence section

### Heading

> **See what memory changed.**

### Body

> Meros shows whether an answer used private or shared memory, then lets you compare it with the same request without recall.

## 8.7 Demo section

### Heading

> **Alice teaches. Bob benefits. Carol stays private.**

### Body

> One support issue becomes a private memory, an approved shared fix, and a better first question for the next customer—without crossing the privacy boundary.

## 8.8 Closing section

### Heading

> **Support that gets better because it remembers the right things.**

### Body

> Meros helps customers stop repeating themselves and helps support teams stop relearning the same lesson.

### CTA

> **Try the memory loop**

---

# 9. Product language and UX copy

## 9.1 Entry and onboarding

### Welcome

> **Meros remembers the right things so support does not start from zero.**

> Start with a support issue. Meros can help even before it has prior memory.

### Access-code prompt

> **Return to your private support memory**

Supporting copy:

> Use the same access code to return to your previous context on another session or device.

### First action

> **Start a support conversation**

### First-use prompt

> **What are you trying to fix, and what have you already tried?**

## 9.2 Chat composer

### Input label

> **Describe the issue**

### Placeholder

> “My CSV upload returns a 422 error after I export it from Excel…”

### Supporting hint

> Include your environment and anything you already tried. Meros will help organise the context.

## 9.3 Private recall

### Label

> **Your private memory**

### Explanation

> Meros found relevant context from your previous sessions.

### Example

> You are using Excel 2021 on Windows, and reducing the file size already failed for this issue. Meros will avoid repeating that step.

## 9.4 Shared recall

### Label

> **Shared support memory**

### Explanation

> A previously confirmed fix matches this symptom.

### Example

> A confirmed CSV 422 pattern is associated with semicolon-delimited Excel exports. Meros is checking the delimiter before repeating the longer troubleshooting path.

## 9.5 No-memory state

> **No relevant memory found.**
>
> Meros is starting with the current conversation.

## 9.6 Memory Lens

### Heading

> **Why this answer?**

### Intro

> Here is the context Meros used to choose the next step.

### Labels

- Your private memory
- Shared support memory
- Current conversation
- Observed
- Confirmed
- Inferred
- Unavailable

### Closing line

> Memory is context, not authority. Review the source before relying on the conclusion.

## 9.7 Candidate Fix Card

### Heading

> **Potential reusable fix**

### Explanation

> Meros found a resolution that may help future customers. Review the exact sanitized text before sharing it.

### Source label

> **Source issue:** CSV import returns HTTP 422

### Privacy warning

> **Keep private information out of shared memory.** Names, emails, account IDs, credentials, and customer-specific details should not be shared.

### Actions

- Save shared
- Keep private
- Edit candidate
- Cancel

## 9.8 Promotion confirmation

### Shared

> **Shared fix saved.** Future conversations may use this pattern after Walrus indexing completes.

### Private

> **Kept private.** The resolution remains available only in your private memory plane.

### Cancelled

> **Nothing was shared.** The candidate remains available for review.

## 9.9 Status copy

### Pending

> **Queued** — the candidate is waiting to be written.

### Saving

> **Saving to Walrus…**

### Stored

> **Stored on Walrus.**

Supporting copy:

> Blob reference: `[reference]`

### Failed

> **Memory save failed.** The candidate was not marked as stored and is available to retry.

### Indexing delay

> **Stored on Walrus.** Recall may become available after indexing catches up.

## 9.10 Compare copy

### Button

> **Compare without memory**

### Explanation

> Same request. Same current-session conversation. Recalled memory removed.

### Result labels

- Memory on
- Memory off
- What changed

### Summary

> With memory on, Meros asked about the delimiter first. Without memory, it returned to generic CSV troubleshooting.

## 9.11 Evidence page

### Heading

> **Meros Evidence**

### Intro

> Inspect what was stored, what was recalled, and what changed.

### Sections

- Private memory count
- Shared fix count
- Cross-session recall
- Cross-user shared recall
- Answers improved by shared memory
- Memory-on versus memory-off comparisons
- Recent write status
- Blob references

### Empty evidence state

> **Evidence will appear as real memory events complete.**
>
> Meros does not count a memory as stored until Walrus confirms the write.

---

# 10. Verbal identity

## 10.1 Personality

Meros should feel:

- calm;
- observant;
- useful;
- transparent;
- careful with boundaries;
- concise under pressure;
- confident enough to say “I do not know”;
- supportive without being over-friendly.

Meros should not feel:

- magical;
- invasive;
- omniscient;
- bureaucratic;
- smug;
- surveillance-oriented;
- like a generic AI assistant;
- like a human pretending to be a database.

## 10.2 Voice principles

### Principle 1 — Say what was remembered

Name the memory plane and the relevant fact.

**Before:**

> I used memory to personalise this response.

**After:**

> **Private memory:** you are using Excel 2021 on Windows, and clearing the cache already failed for this issue.

### Principle 2 — Separate fact from suggestion

Tell the user whether the information was observed, confirmed, or inferred.

**Before:**

> The problem is definitely your delimiter.

**After:**

> A previously confirmed shared fix suggests checking the delimiter first. Meros has not verified your file yet.

### Principle 3 — Protect the boundary in plain language

Make privacy visible without turning every screen into legal copy.

**Before:**

> Your information may be used for knowledge sharing.

**After:**

> This candidate is still private. Nothing enters shared memory until you confirm the exact text.

### Principle 4 — Be concise before being clever

Support users want the next useful step, not a brand performance.

**Before:**

> Let’s embark on an intelligent journey toward resolution.

**After:**

> Let’s check the delimiter before repeating the longer troubleshooting path.

### Principle 5 — Show the next action

Every insight should lead to an understandable action.

**Before:**

> A reusable pattern may exist.

**After:**

> Review the Fix Card, then choose **Save shared** or **Keep private**.

### Principle 6 — Admit missing evidence

An empty field is more trustworthy than an invented answer.

**Before:**

> The memory was stored successfully.

**After:**

> The memory is still saving. Meros will show **Stored on Walrus** after completion and a blob reference.

## 10.3 Tone by context

### Welcome

> **Meros remembers the right things so support does not start from zero.**

### Customer capture

> What are you trying to fix, and what have you already tried?

### Private recall

> Here is the relevant context Meros found from your private memory.

### Shared recall

> A previously confirmed fix matches this symptom. We will check the delimiter first.

### Candidate promotion

> This resolution may help future customers. Review the sanitized text before sharing it.

### Privacy warning

> This candidate contains information that should not enter shared memory. Remove it before continuing.

### Stored status

> **Stored on Walrus.** Blob reference: `[reference]`.

### Failure

> Meros could not complete the memory write. Your candidate is still available to retry; it was not marked as stored.

### No memory

> No relevant memory was found. Meros is starting with the current conversation.

### Compare

> This is the same request without recalled memory. The difference shows what memory contributed.

## 10.4 Cadence and syntax

- Use short sentences for actions and status.
- Use one idea per paragraph in support answers.
- Put the recommended next step before secondary context.
- Use sentence case in the interface.
- Use “you” for user actions and “Meros” for product actions.
- Use labels such as **Observed**, **Confirmed**, **Inferred**, and **Unavailable**.
- Avoid exclamation marks in error and privacy states.
- Avoid anthropomorphic claims such as “I know you better now.”
- Use technical language only when it helps the user or judge understand what actually happened.

## 10.5 Vocabulary bank

Prefer:

- private memory;
- shared support memory;
- relevant context;
- previous attempt;
- confirmed fix;
- candidate fix;
- source;
- stored;
- saving;
- pending;
- failed;
- review;
- promote;
- keep private;
- correction;
- supersedes;
- memory-off comparison;
- evidence;
- blob reference.

Avoid:

- brain;
- company truth;
- mind-reading;
- permanent knowledge;
- omniscient;
- autonomous learning;
- magic;
- perfect answer;
- guaranteed resolution;
- seamless intelligence;
- next-generation support;
- zero-touch support;
- human replacement.

## 10.6 Error-message template

Use this three-part structure:

> **What happened:** [plain fact].  
> **What Meros did:** [safe behaviour].  
> **What you can do:** [next action].

Example:

> **What happened:** The Walrus write did not complete.  
> **What Meros did:** Kept the candidate in a retryable state and did not mark it as stored.  
> **What you can do:** Retry the save or keep chatting without using this memory yet.

---

# 11. Objection handling

## “Is this just a support chatbot with a vector database?”

> No. The proof depends on the separation between private continuity and approved shared learning, plus visible provenance and a memory-off comparison.

## “Why not store the entire transcript?”

> Raw transcripts mix personal data, stale assumptions, and useful facts. Meros extracts durable facts and requires a separate sanitized candidate before shared promotion.

## “Can the model decide what the company should remember?”

> It can propose a candidate. A reviewer must confirm the exact shared text before the write occurs.

## “Can one customer see another customer’s history?”

> No. Private memory is scoped to the server-derived user namespace. Shared memory contains only approved, sanitized reusable knowledge.

## “What happens if the Walrus write is slow?”

> The interface shows the real state—pending, saving, stored, or failed. It does not label a write as stored before completion and a blob reference.

## “Does this replace Zendesk or a helpdesk?”

> Not in the MVP. Meros is a memory layer and support surface focused on proving the memory loop. Helpdesk integrations are roadmap work.

## “What if there is no relevant memory?”

> Meros starts with the current conversation and says that no relevant memory was found. It does not invent a remembered answer.

## “What if a shared fix becomes outdated?”

> Shared memory is timestamped and versioned. A correction can supersede an older fix while preserving the earlier record as history.

---

# 12. Claims discipline

## 12.1 Safe claims when verified

Use these only when the underlying capability is live and tested:

- Meros can recall relevant private context across sessions.
- Meros can retrieve approved shared fixes for another user.
- Meros shows which memory influenced an answer.
- Meros can compare an answer with memory disabled.
- Meros proposes a sanitized candidate fix.
- Meros requires confirmation before shared promotion.
- Meros shows a stored state only after Walrus completion and a reference.
- Meros preserves customer context separately from shared support learning.

## 12.2 Target-language claims

While the feature is still being built, use:

- “Meros is designed to…”
- “The MVP will…”
- “The target flow…”
- “Meros can propose…”
- “The demo should show…”

Do not use future language on one screen and present-tense certainty on another.

## 12.3 Claims to avoid

- Meros knows everything about you.
- Meros solved the issue automatically.
- This fix is guaranteed.
- Meros has learned the company’s truth.
- Your data is shared with the team.
- Meros never forgets.
- Meros replaces support agents.
- Meros prevents all repeated issues.
- Every memory is permanent.
- The answer is correct because the AI remembered it.

## 12.4 Recommended trust statement

> **Meros remembers with boundaries and shows its work.**

## 12.5 Memory-state language

Use:

> **Stored on Walrus** only after completion and a blob reference.

Use:

> **Saving to Walrus** while the request is active.

Use:

> **Candidate not shared** when the reviewer has not approved promotion.

Use:

> **No relevant memory found** when recall returns nothing useful.

Never use:

> Saved forever.

> Company knowledge confirmed.

> The AI knows this is true.

---

# 13. Product language architecture

## 13.1 Approved concept names

- **Private Memory** — user-specific context and history.
- **Shared Memory** — approved, anonymized organizational learning.
- **Memory Lens** — provenance panel explaining what influenced an answer.
- **Fix Card** — candidate reusable resolution awaiting confirmation.
- **Compare** — memory-on versus memory-off explanation.
- **Evidence** — counts, write states, references, and before/after proof.

## 13.2 Navigation labels

Recommended:

- Chat
- Memory
- Evidence
- New support conversation
- Review Fix Card
- Compare without memory

Avoid:

- AI Intelligence
- Neural Knowledge
- Autonomous Desk
- Smart Brain
- Company Mind
- Magic Memory
- Memory Engine

## 13.3 State labels

Use the same terms everywhere:

- Pending
- Saving
- Stored on Walrus
- Failed
- Private
- Shared
- Candidate
- Confirmed
- Observed
- Inferred
- Unavailable

Do not create a different synonym on each screen. Consistency is part of trust.

---

# 14. Demo messaging

## 14.1 Opening line

> **Most support bots forget the customer. Support teams also forget what they learned. Meros addresses both.**

## 14.2 Alice moment

> **Alice teaches Meros a fix. Her personal context stays private.**

## 14.3 Promotion moment

> **This is a candidate, not company knowledge yet. A reviewer must approve the exact shared text.**

## 14.4 Bob moment

> **Bob arrives from a clean account. Shared memory changes the first diagnostic question.**

## 14.5 Carol moment

> **Carol returns in a fresh session. Meros remembers Carol—not Alice or Bob.**

## 14.6 Compare moment

> **Same request. Memory off. The difference is the proof.**

## 14.7 Closing line

> **Meros is not a chatbot with a memory database. It is a support system where every confirmed resolution can make the next conversation better.**

---

# 15. Messaging quality tests

## 15.1 Five-second clarity test

Show the homepage for five seconds and ask:

> What does Meros do?

Expected answer:

> It is a support chatbot that remembers customers and approved fixes.

Failure answers:

- It is a general AI assistant.
- It is a customer-support CRM.
- It is a blockchain database.
- It is a knowledge graph.
- I am not sure.

## 15.2 Relevance test

Ask:

> Who is this for?

Expected answer:

> Customers who do not want to repeat themselves and support teams that want to reuse solved work.

## 15.3 Value test

Ask:

> What do I get from Meros?

Expected answer:

> Personal continuity and better support answers from approved shared learning.

## 15.4 Differentiation test

Ask:

> Why is this different from a normal chatbot or transcript search?

Expected answer:

> It separates private customer memory from approved shared fixes, shows provenance, and proves what memory changed.

## 15.5 Privacy test

Ask:

> What happens to my support history?

Expected answer:

> My private context stays in my private memory; only sanitized, approved fixes can enter shared memory.

## 15.6 Evidence test

Ask:

> How do I know memory actually changed the answer?

Expected answer:

> I can see the source and compare the same request without memory.

## 15.7 Status test

Ask:

> When is a memory actually stored?

Expected answer:

> After Walrus confirms the write and provides a reference—not while it is still saving.

## 15.8 Repeatability test

Different people should describe Meros using the same core ideas:

- private customer continuity;
- approved shared learning;
- visible provenance;
- better next action.

If users describe it as a generic AI bot or automatic company brain, the message is too abstract or too broad.

---

# 16. Implementation rules for copy

## Required

- Lead with the support problem before the infrastructure.
- Say what memory plane is involved.
- Separate observed fact, confirmed information, and inference.
- Make the next action visible.
- Show what happens when no memory exists.
- Show the real persistence state.
- Explain why a shared fix is relevant.
- Keep the customer as the hero and Meros as the guide.
- Use the approved product vocabulary.

## Optional

- Use “collective memory” in long-form strategy or article copy.
- Use “dual-plane memory” in architecture explanations.
- Use the Alice → Bob → Carol narrative in demos and pitches.
- Use the Meros root meaning in a brand-story section, not as the main product explanation.

## Forbidden

- Do not call a candidate a confirmed fix.
- Do not call a pending write stored.
- Do not describe a model inference as a user fact.
- Do not imply that shared memory contains a raw customer conversation.
- Do not use “everyone” to imply that personal data is shared.
- Do not turn the product into a generic AI or decentralization story.
- Do not claim live functionality without evidence.

---

# 17. Locked messaging recommendation

Use the following system consistently across the landing page, product, demo, pitch, and article:

- **Brand:** Meros
- **Category:** Memory-native support chatbot
- **Descriptor:** Support memory that compounds.
- **Product line:** Solve it once. Remember it for everyone.
- **Core message:** Meros turns solved support conversations into reusable memory without turning one customer’s private context into another customer’s data.
- **Customer benefit:** Come back without starting over.
- **Support-team benefit:** Turn resolved work into reusable support memory.
- **Governance line:** Share the fix. Keep the customer private.
- **Proof line:** See what Meros remembered—and why it mattered.
- **Strategic enemy:** Support amnesia.
- **Core loop:** Remember the customer → Solve the issue → Save the lesson carefully → Help the next conversation.
- **Primary proof story:** Alice teaches, Bob benefits, Carol stays private.

## Final verdict

**Strong and ready to systemise.**

The strongest messaging asset is the combination of personal continuity and collective learning. The biggest risk is allowing the product to sound like a generic AI support bot or a vague memory database.

The highest-leverage message is:

> **Support gets better when it remembers the right things.**

The highest-leverage proof is:

> **One confirmed fix changes the next customer’s first question without exposing the original customer.**

---

## Sources

- Source strategy document: `/home/endy/Meros_Seven_Things_Brand_and_Product_Scope.md`
- Walrus Memory documentation: https://docs.wal.app/walrus-memory
- Walrus Memory product page: https://www.walrus.xyz/products/walrus-memory
- Walrus Memory repository: https://github.com/MystenLabs/MemWal
- Walrus Memory chatbot example: https://docs.wal.app/walrus-memory/examples/chatbot
- Walrus Sessions official site: https://thewalrussessions.wal.app/
- Walrus Session 8 submission form: https://airtable.com/appoDAKpC74UOqoDa/shro5iVzzjoWfZlPK

The product behaviours described as target or roadmap must be verified in the live build before being presented as shipped functionality.
