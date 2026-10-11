---

name: parallel-architecture-review

description: Review a feature plan or spec against the current crypto project's architecture using six parallel review domains. Detect structural drift, reshape authorized plans, and propose incremental corrections. Use for architecture review, architecture alignment, drift review, or DDD review before implementation; no prerequisite review skill is required.

---

# Parallel Architecture Review

Six specialized subagents review a plan against the reference architecture, in parallel. Findings reshape the plan and produce **Drift Correction Tasks** — small, piggybacked refactors that pull the codebase back toward principles without blocking delivery.

**Core principle:** Launch all 6 reviewers concurrently → aggregate → reshape plan → add minimal drift tasks → verify alignment within the user’s authorized scope.

**Relationship to other skills:** Use this review after a feature plan or spec exists and before implementation. Prior code review is useful but not required. `writing-plans` can turn the revised plan into implementation tasks, including `00-drift-*` files. Companion planning, code review, execution, and architecture skills are optional; use only those installed and appropriate to the request.

## Configuration

| Variable | Default | Purpose |

|----------|---------|--------|

| `ARCHITECTURE_FILE` | `ARCHITECTURE.md` (repo root) | Reference architecture |

| `REVIEW_CYCLES` | `1` | How many full review→reshape loops before handoff |

| Bundled references | Directory containing this `SKILL.md` | Resolve reference links relative to this skill |

## When to Use

- A feature plan or spec exists and needs architecture alignment

- You are about to run `writing-plans` and want the plan shaped to reference architecture first

- The codebase has accumulated structural drift and you want incremental correction woven into feature work

- User mentions architecture drift, entropy, or "pulling back to the original design"

**When NOT to use:**

- No plan or spec exists yet — gather requirements and draft the feature approach first

- User wants a broad architecture audit without a feature plan — use a repository-wide audit workflow; an installed architecture skill may help

- User wants terminology-only alignment — review the current glossary and spec directly; a companion documentation skill is optional

## Step 0 — Load Reference Architecture

Read repository instructions first. Before launching reviewers, read available references in order:

1. `${ARCHITECTURE_FILE}` — actual principles, components, ownership, dependencies, placement rules, and drift table

2. `CONTEXT.md`, `CONTEXT-MAP.md`, or the project’s equivalent glossary/spec — use documented terms where available

3. [DDD-REFERENCE.md](DDD-REFERENCE.md) — optional tactical guidance when the project actually uses DDD

4. `docs/adr/` — load-bearing decisions; do not re-litigate accepted ADRs

5. The full plan artifact — no summaries, no truncation

If `ARCHITECTURE.md` is missing, follow [ARCHITECTURE-FORMAT.md](ARCHITECTURE-FORMAT.md) to draft a starter from codebase evidence. Label it provisional and cite the source evidence. Use it as a working reference for this cycle without blocking feature work; do not elevate inferred principles to accepted policy. Leave unresolved architectural decisions explicit.

## Step 1 — Gather Artifact

```bash

cat path/to/PLAN.md

# Optionally: git diff for files the plan will touch

# Identify the intended review base before using a branch diff.
git diff
git diff --cached

```

Pass the complete plan text or its exact readable path to every subagent. Include relevant source paths, tests, and the repository root; reviewers must inspect evidence rather than infer violations from labels alone.

## Step 2 — Launch All 6 Subagents Concurrently

Dispatch **six** reviewers concurrently using the available subagent tool (Agent/Task in Claude Code). Each receives the full plan and reference artifacts or exact readable paths, relevant ADRs, documented domain terms, and the plan’s structural-change section if present. Reviewers are read-only; the coordinator edits after aggregation. If six concurrent reviewers are unavailable, disclose the limitation and cover the same domains in batches or inline without claiming full parallel execution.

**Project adaptation:** Derive chain, execution model, business lifecycle, actors, stack, and ownership from the current repository and spec. Apply DDD checks only where adopted by the project. Pure functions, procedural modules, and immutable data models are valid choices; do not require entity methods merely to satisfy a rich-model preference. Respect documented atomic transaction boundaries, including on-chain transitions spanning multiple records or components. Do not replace necessary atomicity with eventual consistency.

For applicable changes, review signing and authorization boundaries, custody and asset ownership, transaction atomicity, amount precision, state invariants, external-data trust, finality, and on-chain/off-chain recovery. Flag only concerns relevant to the plan and supported by repository evidence.


| Subagent | Domain | Do NOT flag |

|---|---|---|

| Agent 1 — Principle Alignment | Plan violates stated principles in ARCHITECTURE.md (layer rules, DDD principles, dependency direction, pure-core, data-first) | Style preferences not in ARCHITECTURE.md; personal taste |

| Agent 2 — Structural Drift | Wrong bounded context; files outside DDD placement rules; cross-context domain imports; aggregate split across wrong folders; duplicates existing module responsibilities | Changes explicitly justified and bounded in the plan |

| Agent 3 — Aggregate & Seam | Wrong invariant ownership or consistency boundaries; unnecessary seams; DDD violations only where DDD is adopted; shallow modules; pass-through layers | Documented ADR tradeoffs; abstractions with 3+ real implementations |

| Agent 4 — Coherence Shaper | Plan chooses locally-minimal approach that distorts system shape; proposes alternative placement, aggregate ownership, or event-driven sequencing that better matches the project’s model and principles | Equivalent approaches with no structural difference |

| Agent 5 — Incremental Corrector | Smallest refactor (≤3 files) piggybackable on this feature's touch points to resolve drift-table item or DDD violation in adjacent code | Refactors >3 files; unrelated drive-by refactors; REMOVE with confidence <60% |

| Agent 6 — Entropy Scanner | Applicable DDD anti-patterns; unsupported abstraction, speculative configuration, duplicated responsibilities; duplicated state; stringly-typed domain IDs | Stable-by-design code; regulatory requirements |

**Execution rules:**

- Launch six reviewers concurrently when supported; disclose fallback

- Each agent receives the same complete artifacts or exact readable paths

- Each agent has exactly one domain

- Wait for all 6 before aggregating

## Step 3 — Agent Prompts

Append the full plan + ARCHITECTURE.md after each prompt.

---

**Agent 1 — Principle Alignment**

> Read the adopted ARCHITECTURE.md principles (including DDD only if used) and dependency rules. Cross-check plan terminology against CONTEXT.md ubiquitous language. For each principle, check whether the plan complies, violates, or is silent. Violations: cite the principle, the plan section, and a concrete reshape recommendation. Return: `Severity | Principle | Plan location | Violation | Reshape recommendation`. Close immediately when done — output findings or `No valid Principle Alignment findings.`

---

**Agent 2 — Structural Drift**

> Compare the plan's proposed layout against documented components, ownership, dependency rules, and any adopted DDD placement rules. Flag: code in wrong context or aggregate folder; cross-context domain model imports; files in wrong layers; responsibilities assigned to wrong aggregate root; integration that bypasses the documented component contracts or context map. Return: `Severity | Drift type | Location | Current vs ideal placement | Fix`. Close immediately when done.

---

**Agent 3 — Aggregate & Seam**

> Check invariant ownership, transaction/consistency boundaries, module interfaces, seams, and adapters against adopted architecture. Consult DDD-REFERENCE.md only where DDD is used. Flag business rules assigned to the wrong owner, leaks across documented boundaries, shallow pass-through layers, and abstractions without a concrete purpose. Do not automatically flag cross-aggregate atomic transactions, a single-adapter interface, or pure functions with data types. Preserve the project’s required atomicity and test seams. Return: `Severity | Finding | Location | Violated rule/evidence | Recommendation`. Close immediately when done.


---

**Agent 4 — Coherence Shaper**

> Compare the plan's chosen approach against the smallest coherent solution under the adopted architecture: correct ownership, integration contracts, and required consistency guarantees. If a different sequencing, aggregate assignment, or event-based handoff would satisfy the feature with less architectural distortion, propose it with before/after structure. Return: `Severity | Current approach | Coherent alternative | Why better | Plan sections to rewrite`. Close immediately when done.

---

**Agent 5 — Incremental Corrector**

> Read the drift table in ARCHITECTURE.md (if present). For each row AND for violations found in adjacent code the plan will touch: propose a drift correction task that (a) modifies ≤3 files, (b) can piggyback on files already in the plan's blast radius, (c) moves one step toward ideal state. Use the cost checklist below; a companion complexity skill is optional. Return: `Priority (MUST/SHOULD/DEFER) | Drift item | Files (≤3) | One-sentence change | CoK if removing | Piggyback on plan step #`. Close immediately when done.

---

**Agent 6 — Entropy Scanner**

> Scan the plan for entropy signals: applicable anti-patterns documented in ARCHITECTURE.md; speculative abstractions, configuration without consumers, duplicated responsibilities, unnecessary frameworks, and persistence leaks; duplicated state; stringly-typed domain IDs; domain events named as commands. Cross-reference CONTEXT.md for term misuse. Return: `Severity | Signal | Location | Entropy type | STOP/WARN/OK`. Close immediately when done.

---

## Step 4 — Aggregate After All 6 Return

1. **Merge** findings into unified list

2. **Deduplicate** — same root issue from multiple agents → keep most actionable framing

3. **Triage — discard:**

   - Violations of personal preference not in ARCHITECTURE.md

   - Refactors >3 files (defer to `improve-codebase-architecture` or a future plan)

   - ADR conflicts unless friction warrants reopening (mark clearly)

   - REMOVE recommendations with confidence <60%

4. **Reshape the plan when edits are authorized:**

   - Rewrite affected sections (Approach, Implementation steps, Architecture & Structure Changes)

   - Validate proposed alternatives against requirements, consistency guarantees, and evidence; explain material tradeoffs. For review-only requests, report proposed edits without changing files

5. **Emit drift correction tasks** — Agent 5's MUST and SHOULD items become tasks; DEFER items remain documented with their reason and dependency

6. **Update ARCHITECTURE.md drift table** — add new rows for unresolved entropy; mark items with emitted tasks as planned, retaining their task links; remove or mark resolved only after implementation and verification

## Step 5 — Plan Additions

Append or update these sections in PLAN.md:

### Architecture Alignment (new section before Implementation)

```markdown

## Architecture Alignment

| Principle | Status | Notes |

|-----------|--------|-------|

| Ubiquitous language | ✅ Compliant | Uses `Order` per CONTEXT.md, not `Purchase` |

| Aggregate boundary | ⚠️ Reshaped | Preserves the documented consistency boundary and atomic state transition |

| Pure core, effects at edges | ✅ Compliant | Domain rules stay in the documented owning component |

| Domain MUST NOT import infra | ⚠️ Reshaped | Moved DB call from domain to repository adapter |

**Reshapes applied:** <bulleted list of plan changes made during this review>

```

### Drift Correction Tasks (new section after Architecture Alignment)

```markdown

## Drift Correction Tasks

Minimal refactors piggybacked on this feature. Each task ≤3 files. writing-plans emits these as `00-drift-*.md` before feature plan files.

### Drift Task 1: <short name> (SHOULD)

**Why:** <one sentence — which principle or drift-table row>

**Piggyback:** Step 3 of Implementation (same files already open)

**Files:**

- Modify: `src/domain/Pricing.ts`

- Modify: `src/application/PlaceOrder.ts`

**Change:** Move the identified domain rule into its documented owner while preserving its public API and consistency guarantees.

**Verification:** Run the repository’s exact applicable test command; verify both the intended transition and its rejection behavior. Replace this template sentence with actual test names and expected results in the emitted task.

```

Priority rules:

| Priority | Meaning | Action |

|----------|---------|--------|

| MUST | Plan violates principle without this fix | Include in `00-drift-*.md`; block feature plan files until done OR reshape plan to avoid violation |

| SHOULD | Opportunistic correction in blast radius | Include in `00-drift-*.md`; run before or interleaved with feature tasks |

| DEFER | Correct but not in blast radius | Add to ARCHITECTURE.md drift table only |

## Step 6 — Review Cycles

Repeat Steps 1–5 for `${REVIEW_CYCLES}` iterations (default 1). Stop early if:

- All agents return no valid findings

- No new drift tasks since last cycle

- User specifies a cycle count and it's reached

Between cycles, the plan file is the artifact — each cycle reads the updated plan.

## Step 7 — Output Format

**1. Architecture Findings** — aggregated, grouped by agent domain

**2. Plan Reshapes** — what changed in PLAN.md and why (with section references)

**3. Drift Correction Tasks** — table of emitted tasks with priority, files, piggyback point

**4. ARCHITECTURE.md Updates** — drift table changes (if any)

**5. Handoff** — confirm readiness for `writing-plans`:

> Plan architecture-aligned. {N} drift task(s) ready for `00-drift-*.md` emission. Report actual readiness, unresolved prerequisites, and saved paths. Continue to writing-plans if already requested; otherwise offer the available implementation-planning workflow.

## Red Flags

**Never:**

- Claim parallel execution if reviewers ran sequentially or inline

- Truncate plan or ARCHITECTURE.md for subagents

- Propose >3-file refactors as drift tasks (defer to separate plan)

- Block delivery for large architectural overhauls

- Re-litigate accepted ADRs without marking the conflict explicitly

- Produce findings without reshaping the plan or documenting why a reshape was rejected

**If a violation requires >3 files to fix:**

- Reshape the plan to avoid introducing NEW violation

- Add a DEFER row to the drift table

- Suggest `improve-codebase-architecture` for a future dedicated session

## Quick Reference

| Phase | Action | Constraint |

|-------|--------|------------|

| Load | ARCHITECTURE.md + CONTEXT + ADRs + full plan | Draft ARCHITECTURE.md if missing |

| Launch | Six reviewers | Concurrent when supported; disclose fallback |

| Aggregate | Merge → dedupe → triage | Discard preference-only findings |

| Reshape | Edit PLAN.md in place | Smallest coherent change |

| Drift tasks | ≤3 files each, piggybacked | MUST/SHOULD/DEFER |

| Cycle | Repeat until clean or N reached | Plan is the artifact |

| Handoff | → writing-plans | Drift tasks as `00-*` files |

## Reference Files

| File | Read when |

|------|-----------|

| [ARCHITECTURE-FORMAT.md](ARCHITECTURE-FORMAT.md) | Creating or updating ARCHITECTURE.md |

| [DDD-REFERENCE.md](DDD-REFERENCE.md) | Aggregate boundaries, context maps, tactical DDD |

| Installed companion skills | Optional vocabulary, scoring, or documentation workflows; never require a hardcoded installation path |

## Cost and Evidence Calibration

Treat nesting counts, file length, and complexity scores as investigation signals, not automatic violations. A finding must cite an adopted rule or demonstrate a concrete consequence.

For a removal proposal, assess upkeep, verification burden, cognitive load, coupling, and replacement cost. Record a low/medium/high cost estimate with evidence; use a numeric CoK score only when the project defines its scale. Do not invent precision or remove a component based on an unsupported threshold.

Before handoff, verify every new reference resolves, the revised plan still covers the spec, drift tasks respect the three-file cap, and accepted architecture rules remain consistent. State which checks ran and disclose unresolved blockers. Review-only requests must leave source documents unchanged.
