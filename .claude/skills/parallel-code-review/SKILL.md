---
name: parallel-code-review

description: Use for a deep parallel review of a git diff or completed plan/spec in any crypto project, covering six domains—reuse, quality, efficiency, architecture, elegance, and complexity reduction. Trigger on parallel review or multi-agent review. Fix validated issues when requested; respect review-only scope.
---

# Parallel Code Review

Six specialized subagents review independently, in parallel, then findings are merged, deduplicated, and validated issues are fixed within the authorized scope. For review-only requests, report findings without editing files.

**Core principle:** Launch six independent reviewers concurrently → aggregate → validate → fix authorized issues → verify.

## When to Use

- You have a `git diff` or a completed plan/spec ready to review

- You need coverage across **all six** domains simultaneously (reuse, quality, efficiency, architecture, elegance, complexity reduction)

- You want findings fixed in the same session, not just reported

Use this workflow for independent domain-specific analysis. Do not require a companion review skill.

## The Process

### Step 1 — Gather Artifact

Get the full artifact — no summaries, no truncation:

```bash

# If git diff exists:

git diff              # unstaged changes
git diff --cached     # staged changes
# For a branch review, first identify the intended base branch and compare its merge base to HEAD.

# Otherwise:

cat path/to/plan-or-spec.md

```

Read repository instructions and relevant architecture documents. Derive roles, lifecycle, blockchain, stack, and trust boundaries from the current project rather than importing another product’s assumptions. Inspect surrounding code and tests before deciding a finding is valid. Include untracked files when they belong to the requested change.

For relevant crypto changes, include authorization, signing boundaries, amount precision and rounding, asset conservation, transaction failure handling, and on-chain/off-chain consistency in the appropriate reviewer’s scope. Apply chain-specific checks only when supported by repository evidence. These six domains do not constitute a complete security audit.

### Step 2 — Launch All 6 Subagents Concurrently

Dispatch **exactly six** subagents concurrently using the host’s supported subagent mechanism. In Claude Code, use its available Agent/Task tool. Give each reviewer the complete artifact or an exact artifact path they can read, repository location, relevant instructions, and a single domain. Reviewers must inspect source as needed and must not edit files. If six concurrent reviewers are unavailable, disclose the limitation and cover all six domains in available batches or inline; do not claim a full parallel review occurred.

| Subagent | Domain | Do NOT flag |

|---|---|---|

| Agent 1 — Code Reuse | Duplication, missed reuse, copy-paste drift, ignored base abstractions | Intentional specializations; external library calls that look similar |

| Agent 2 — Code Quality | Control flow depth, boolean flags, enum opportunities, leaky abstractions, parameter bloat, mixed responsibilities | Style-only issues with no behavioral impact; necessary verbosity |

| Agent 3 — Efficiency | Recomputation, missed concurrency, resource leaks, unbounded collections, overly-broad fetches | Micro-optimizations with negligible real-world impact |

| Agent 4 — Architectural Design | Narrow vs kitchen-sink interfaces, illegal states representable in types, stringly-typed domain objects, layered architecture violations, concurrency model choices (thread-per-connection vs event loop, shared mutable state vs channels/immutable snapshots) | Intentional architectural tradeoffs documented by comments or conventions |

| Agent 5 — Code Elegance & Naming | Global state that should be passed explicitly (pure functions), hardcoded magic constants that should be config/data-driven, naming without subsystem prefixes in large files, repeated open-coded logic that should be a small helper, pointer-heavy data layouts where flat arrays would serve, preprocessing work left in hot loops | Legitimate use of globals for singleton resources; constants that are truly invariant |

| Agent 6 — Complexity Reduction | Should use complexity-reducer skill, if available. Over-engineering anti-patterns (OE-01–OE-10): premature abstraction, future-proofing by speculation, pattern worship, homegrown frameworks, over-configurability, premature optimization, type-system maze, microservice overuse, DRY obsession, excessive defensive programming. YAGNI violations: code/features/abstractions built for speculative future needs. Cognitive complexity >15 (SIMPLIFY signal) or >25 (REMOVE signal). Single-use abstractions, unchanged config options >50%, 3+ generic nesting levels | Stable-by-design code with intentional low change frequency; regulatory or compliance requirements; abstractions with 3+ real implementations; documented architectural tradeoffs |

**Execution rules (non-negotiable):**

- Launch all six concurrently when the host supports it

- Each agent receives the same complete artifact or exact path to it — no summaries or truncation

- Each agent has exactly one domain — no cross-assignment

- Wait for all 6 to return before aggregating

### Step 3 — Agent Prompts

Pass this exact prompt as the core instruction for each subagent (append the full artifact after):

---

**Agent 1 — Code Reuse**

> Inspect the diff/plan for: logic that reimplements an existing utility/helper/service/hook already present; inline logic that should delegate to an existing abstraction; functions or classes that differ only trivially from existing ones (copy-paste drift); missed use of established patterns (base class, shared error type, standard retry helper). Return findings as: `Severity | Finding | Location (file + line range) | Recommendation`.

>

> **Close immediately when done.** Output your findings table, or the single line `No valid Code Reuse findings.` — then stop. Do NOT wait for the orchestrator to acknowledge. Do NOT enter "awaiting instruction."

---

**Agent 2 — Code Quality**

> Inspect the diff/plan for: deeply nested conditionals (3+ levels) fixable with guard clauses; boolean flag variables carrying state across blocks; complex switch/if-else chains over a type field; redundant state that can be derived; multiple booleans representing mutually exclusive modes (should be an enum); stringly-typed identifiers/status codes; functions with 5+ parameters; leaky abstractions; mixed responsibilities in one function/class; unnecessary JSX nesting; inline styles or magic values. Return findings as: `Severity | Finding | Location (file + line range) | Recommendation`.

>

> **Close immediately when done.** Output your findings table, or the single line `No valid Code Quality findings.` — then stop. Do NOT wait for the orchestrator to acknowledge. Do NOT enter "awaiting instruction."

---

**Agent 3 — Efficiency**

> Inspect the diff/plan for: values recomputed on every call that could be memoized; redundant existence checks before fetches; expensive work inside loops; no-op updates (re-renders when state unchanged, re-subscribing to already-subscribed events); sequential `await A; await B` that could be `Promise.all([A, B])`; event listeners/subscriptions/timers registered without cleanup; unbounded caches or queues; fetching more data than needed (missing pagination, field projection). Return findings as: `Severity | Finding | Location (file + line range) | Recommendation`.

>

> **Close immediately when done.** Output your findings table, or the single line `No valid Efficiency findings.` — then stop. Do NOT wait for the orchestrator to acknowledge. Do NOT enter "awaiting instruction."

---

**Agent 4 — Architectural Design**

> Inspect the diff/plan for: interfaces or context objects that expose more than callers need (kitchen-sink types — narrow them); domain concepts passed as raw strings that should be typed structs or value objects (stringly-typed identifiers, status codes, config keys); multiple boolean fields representing mutually exclusive states that should be a single enum/sum type (make illegal states unrepresentable); layers that violate their own abstraction boundary (e.g., a service returning raw DB rows, a UI component accepting internal store shape); concurrency model mismatches (thread-per-connection where an event loop fits, shared mutable state where channels/immutable snapshots would eliminate locking); missing extension points causing repeated open-coded special-case branches over a type field (should be a registry or dispatch table). Do NOT flag: intentional architectural tradeoffs with clear comments; external library APIs you cannot change; specializations that genuinely cannot share an abstraction. Return findings as: `Severity | Finding | Location (file + line range) | Recommendation`.

>

> **Close immediately when done.** Output your findings table, or the single line `No valid Architectural Design findings.` — then stop. Do NOT wait for the orchestrator to acknowledge. Do NOT enter "awaiting instruction."

---

**Agent 5 — Code Elegance & Naming**

> Inspect the diff/plan for: global or module-level mutable state that could be replaced by explicit parameters (Carmack pure-function principle — pass state, don't read globals); hardcoded numeric or string magic values that belong in a config file or named constant; functions or subsystems that lack a consistent naming prefix, making call-site ownership ambiguous in large files (Linux/Git prefix convention); repeated open-coded sequences (lock → mutate → unlock; open → read → close) that should be extracted into a small focused helper; data schemas using pointer-rich graph structures where a flat array/offset layout would be simpler and more cache-friendly; runtime computation that belongs in a preprocessing/build step (precompute once, look up at runtime). Do NOT flag: legitimate use of module-level singletons with clear ownership; constants that are truly invariant by design; verbosity that is necessary for clarity. Return findings as: `Severity | Finding | Location (file + line range) | Recommendation`.

>

> **Close immediately when done.** Output your findings table, or the single line `No valid Code Elegance & Naming findings.` — then stop. Do NOT wait for the orchestrator to acknowledge. Do NOT enter "awaiting instruction."

---

**Agent 6 — Complexity Reduction**

> Inspect the diff/plan for over-engineering and unnecessary complexity using the checklist below. Use a complexity-reducer skill only if installed and relevant; it is optional. Specifically look for:

>

> **Over-engineering anti-patterns:** premature abstractions used in only 1 place (OE-01); future-proofing with no concrete near-term plan (OE-02); design-pattern overhead that exceeds problem complexity — factory/strategy/observer where an `if` would do (OE-03); homegrown frameworks where a mature library exists (OE-04); configuration options that never change in practice (OE-05); optimization without measured bottlenecks (OE-06); deeply nested generics or conditional types that harm comprehension (OE-07); microservices with huge operational cost for tiny traffic (OE-08); DRY extraction of coincidentally similar code that changes for different reasons (OE-09); redundant defensive checks on internal paths that are not system boundaries (OE-10).

>

> **YAGNI violations:** code, abstractions, or features built for speculative future needs with no current usage. Apply the YAGNI Fast Path: Is it used now? → No → Concrete plan within 6 months? → No → flag as REMOVE candidate.

>

> **Cognitive complexity:** functions with cognitive complexity >15 (SIMPLIFY signal) or >25 (REMOVE/rewrite signal). Count: +1 for control-flow branches, +1 for loops, +1 for logical-operator type switches, +1 per additional nesting level.

>

> **Subtraction candidates:** single-use abstractions that should be collapsed; >50% unchanged config options that should be hardcoded; `"TODO: future use"` comments signaling speculative code.

>

> For each finding, estimate a Cost-of-Keeping score (0-10) using: Upkeep (25%), Verification (20%), Cognitive Load (25%), Entanglement (15%), Replaceability (15%). Recommend: KEEP (CoK 0-3), SIMPLIFY (CoK 4-6), or REMOVE (CoK 7+). Do NOT propose REMOVE when confidence is <60%.

>

> Do NOT flag: stable-by-design code with intentional low change frequency; regulatory or compliance requirements; abstractions with 3+ real implementations; documented architectural tradeoffs with clear comments.

>

> Return findings as: `Severity | Finding | Location (file + line range) | CoK Score | Recommendation (KEEP/SIMPLIFY/REMOVE)`.

>

> **Close immediately when done.** Output your findings table, or the single line `No valid Complexity Reduction findings.` — then stop. Do NOT wait for the orchestrator to acknowledge. Do NOT enter "awaiting instruction."

---

### Step 4 — Aggregate After All 6 Return

1. **Merge** all findings into a unified list

2. **Deduplicate** — when two agents flag the same root issue from different angles, keep the most actionable framing and note both categories

3. **Triage — discard:**
   - Findings unsupported by the diff/plan (speculative)

   - Low-severity findings with no meaningful consequence

   - Findings contradicted by visible project conventions

4. **Fix** remaining validated findings when fixes are authorized. Keep changes within scope; for review-only requests, report findings without modifying files

5. **Defer explicitly** — if a valid finding cannot be fixed without broader context (e.g., schema migration outside this diff), document it with the exact reason

### Step 5 — Output Format

**1. Subagent Findings** — aggregated, deduplicated, grouped by category:

```

### Code Reuse

- [severity] one-line summary — file:line-range

### Code Quality

- [severity] one-line summary — file:line-range

### Efficiency

- [severity] one-line summary — file:line-range

### Architectural Design

- [severity] one-line summary — file:line-range

### Code Elegance & Naming

- [severity] one-line summary — file:line-range

### Complexity Reduction

- [severity] one-line summary — file:line-range — CoK: X.X — KEEP/SIMPLIFY/REMOVE

```

**2. Fixes Made** — bulleted list of concrete changes, grouped by category. For each: what changed and why.

**3. Deferred Items** (if any) — valid issues not fixed, with explicit reason.

**4. Verification** — state the review scope, whether six reviewers ran concurrently, relevant tests/checks executed and their results, and any remaining limitations. Do not claim checks passed if they were not run.

> If no valid issues were found after triage: **"The reviewed changes were already clean across all six domains. No fixes were needed."**

## Red Flags

**Never:**

- Claim parallel execution when reviewers actually ran sequentially or inline

- Summarize or truncate the artifact before passing it to agents

- Cross-assign domains (each agent stays in its lane)

- Leave valid findings unexplained: report a fix, a deferral reason, or review-only status for each

- Treat this skill as authorization for changes beyond the user’s request, deployments, transactions, or destructive operations

- Move to aggregation before all 6 subagents have returned

**If a finding is valid but requires changes outside the diff:**

- Mark it as a deferred item with the explicit reason — do not skip it silently

## Quick Reference

| Phase | Action | Constraint |

|---|---|---|

| Gather | Full diff or full plan text | No truncation |

| Launch | Six domain reviewers | Concurrent when supported; disclose fallback |

| Wait | All 6 must return | No early aggregation |

| Aggregate | Merge → deduplicate → triage | Discard speculative/low-impact |

| Fix | Validated, authorized findings | Respect review-only requests and scope |

| Defer | Valid but out-of-scope | Must document reason |

| Output | Findings → Fixes → Deferred → Verification | In that order |
