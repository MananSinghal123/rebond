---

name: writing-plans

description: Write detailed implementation plans from a spec or requirements for multi-step work in crypto projects, before touching implementation code. Adapt to the current repository, blockchain, architecture, and testing tools.

---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

**Apply Elegant Code Principles (Torvalds/Carmack):**

1. **Data First:** Define types/interfaces/schemas before planning any behavioral tasks.

2. **Flat Paths:** Enforce flat code in your planned implementation (max 2 levels nesting, guard clauses).

3. **Pure Core:** Ensure business logic is planned as pure functions, with side-effects pushed to edges.

4. **Assert Invariants:** Plan to use assertions to crash on missing required data instead of defensive noise.

5. **Inline Singles:** Plan to extract functions only if called 3+ times, independently testable, or >50 lines.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** Use the current project checkout or a dedicated worktree according to the user’s instructions and repository workflow. Do not require another skill to create it.

**Architecture input:** Read repository instructions, the spec, and available architecture documents before decomposing tasks. Respect the project’s actual module boundaries and ownership. Cite relevant documents and the owning component in each plan’s `**Architecture:**` header. Apply DDD concepts only when the repository uses them. If documentation is missing, inspect the code and distinguish observed architecture from assumptions.

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>/01-<part-name>.md`

- (User preferences for plan location override this default)

## Project Context for Crypto Work

Derive the product, actors, lifecycle, chain, languages, wallet interfaces, assets, and trust boundaries from the current spec and repository. Do not carry names, roles, market sectors, or business rules over from another project.

For applicable tasks, specify authorization, transaction signing, asset units and rounding, state transitions, failure recovery, and on-chain/off-chain consistency. Include chain-specific concerns only when relevant to the change and supported by the project’s architecture. Record unknowns as explicit prerequisites rather than inventing contract addresses, economic terms, or protocol behavior.

## Drift Correction Plans (emit first)

If the source plan has `## Drift Correction Tasks`, emit one plan file per task **before** feature plans:

- Naming: `00-drift-<short-slug>.md`, `00-drift-<short-slug>-2.md`, …

- Each drift plan follows the same 3-file cap and task structure as feature plans

- MUST-priority drift plans come before SHOULD-priority

- Reference the parent plan's piggyback step in the Goal line

- After drift plans, continue numbering feature plans at `01-`, `02-`, …

## Strict 3-File Cap & Multi-Plan Structure

You must break the overall feature down into several sequentially numbered plan files (e.g., `01-initial-setup.md`, `02-core-logic.md`, `03-api-integration.md`). 

**HARD CONSTRAINT:** Each individual plan file is strictly capped at modifying a MAX of 3 files.

If your task requires touching more than 3 files, you MUST break it down further into multiple plan files. 

Each plan file should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in. **Lock in the Data Model before planning behavioral functions.**

- **Data First:** explicitly plan types, schemas, and interfaces before assigning tasks for function bodies.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.

- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.

- Files that change together should live together. Split by responsibility, not by technical layer.

- Ensure the architecture avoids special-case branches by preferring robust data design over algorithmic hacks.

- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

## Testing Standard

Follow the repository’s documented testing policy and existing toolchain. Prefer integration tests through public entries with real internal collaborators and observable outcomes. Use E2E tests for user journeys when appropriate. Keep useful unit tests; do not rewrite them solely because they test a smaller unit.

Select tools from repository evidence, rather than assuming JavaScript or a particular blockchain. Use the existing contract or validator test harness for on-chain behavior, the service test runner for APIs, and browser tooling for UI journeys. Use isolated local networks, emulators, or controlled fixtures as appropriate; never require live funds for tests.

Mock only external boundaries when practical. Assert state changes, returned results, asset movement, or rejection outcomes rather than only call counts. Add a soundness check for new behavioral tests: temporarily introduce the relevant defect, verify the test fails for the intended reason, restore, and rerun.

### Gherkin naming

Titles carry the **usage intent**, so the **year-later failure question** answers itself: when this example goes red a year from now, does the title alone say whether product intent broke or the test is stale?

| Layer | Gherkin | Writes |

|---|---|---|

| Outer `describe` | Feature | The product check a human would name out loud |

| Inner `describe` | Given / When | The setup condition: `when <state that decides the branch>` |

| `it` | Then | A verb phrase completing the sentence `it …`: `<outcome> when <deciding condition>` |

Setup lives in `beforeEach`; `it` holds the act and the outcome assertions. Use the repo's own field, enum, and constant names in titles. Read every `it` aloud as `it <string>` — when it is not a sentence, rewrite it:

| Rejected | Why | Sound |

|---|---|---|

| `it('when the total is high')` | `it when…` is not a sentence | `it('waives shipping when the cart total is above the threshold')` |

| `it('threshold case')` | Noun label, names no outcome | `it('records a zero shipping charge when the cart total is above the threshold')` |

| `describe('checkout integration')` | Names a test style; `integration` names a third-party boundary, not several conditions in one block | `describe('checkout waives shipping above the free-shipping threshold')` |

| `it('blocks the order when the discount inflates the subtotal')` | Inverts causality — names the ignored input as the cause | `it('blocks the order when the pre-discount subtotal is already above the limit')` |

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**

- "Write the failing integration test" - step

- "Run it to make sure it fails" - step

- "Implement the minimal code to make the test pass" - step

- "Run the tests and make sure they pass" - step

- "Soundness check: break the line under test, watch it go red, restore" - step

- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown

# [Feature Name] Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---

```

## Task Structure

````markdown

### Task N: [Component Name]

**Files:**

- Create: `src/checkout/shipping.ts`

- Modify: `src/checkout/create-order.ts:41-58`

- Test: `tests/integration/checkout.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts

describe('checkout waives shipping above the free-shipping threshold', () => {

  describe('when the cart total is above the threshold', () => {

    it('records a zero shipping charge on the created order', async () => {

      const cart = await request(app)

        .post('/carts')

        .send({ items: [{ sku: 'ABC', priceCents: 6000 }] });

      const checkout = await request(app)

        .post('/checkout')

        .send({ cartId: cart.body.id });

      expect(checkout.status).toBe(201);

      const order = await orders.findById(checkout.body.orderId);

      expect(order.shippingCents).toBe(0);

    });

  });

});

```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/integration/checkout.test.ts -t 'records a zero shipping charge'`

Expected: FAIL — `expected 599 to be 0`

- [ ] **Step 3: Write the minimal implementation**

```ts

export const FREE_SHIPPING_THRESHOLD_CENTS = 5000;

export const FLAT_SHIPPING_CENTS = 599;

export function shippingCentsFor(totalCents: number): number {

  if (totalCents >= FREE_SHIPPING_THRESHOLD_CENTS) return 0;

  return FLAT_SHIPPING_CENTS;

}

```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/integration/checkout.test.ts -t 'records a zero shipping charge'`

Expected: PASS

- [ ] **Step 5: Soundness check**

Break `shippingCentsFor` — return `FLAT_SHIPPING_CENTS` unconditionally.

Run the same command. Expected: FAIL on `expect(order.shippingCents).toBe(0)`.

Restore the implementation and re-run. Expected: PASS.

- [ ] **Step 6: Commit**

```bash

git add tests/integration/checkout.test.ts src/checkout/shipping.ts src/checkout/create-order.ts

git commit -m "feat: waive shipping above the free-shipping threshold"

```

````

## No Placeholders or Sloppy Code

Every step must contain the actual content an engineer needs. These are **plan failures** — never write them:

- "TBD", "TODO", "implement later", "fill in details"

- "Add appropriate error handling" / "add validation" / "handle edge cases"

- Defensive `try/catch` or null-checks hiding invariant violations (plan assertions instead)

- Code snippets with deep nesting (always use guard clauses to keep paths flat < 3 levels)

- Comments explaining WHAT code does (rename the function/variable in the plan instead)

- "Write tests for the above" (without actual test code)

- An integration test bypassing the public entry or mocking the internal behavior it claims to verify

- A spy or call-count assertion as the only proof that the new code ran

- An assertion on a fixture the step itself created in setup

- A test step with no soundness check to red it

- "Similar to Task N" (repeat the code — the engineer may be reading tasks out of order)

- Steps that describe what to do without showing how (code blocks required for code steps)

- References to types, functions, or methods not defined in any task

## Implementation

For heavy reference on Elegant Code transformations to emulate in your task implementation steps, review:

- `examples/01-control-flow-and-data.md` (Guard clauses, errors, data modeling, sum types)

- `examples/02-apis-and-concurrency.md` (Small interfaces, state machines, concurrency primitives)

- `examples/03-performance-and-patterns.md` (Memory layout, zero-copy, declarations, layered CLI)

- `examples/04-linux-and-games.md` (Prefixes, helpers, macros, data-driven design)

## Remember

- Exact file paths always

- Complete code in every step — if a step changes code, show the code

- Exact commands with expected output

- DRY, YAGNI, TDD, frequent commits

## Self-Review

After writing the complete plan, look at the spec with fresh eyes and check the plan against it. This is a checklist you run yourself — not a subagent dispatch.

Perform this self-review internally and report only actionable findings.

**1. Elegance & Pre-flight:** Did you verify this solves a real problem? Did you define types before functions? Is there a simpler way?

**2. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.

**3. Code Quality scan:** Search your plan for red flags — placeholders, >2 levels of nesting, WHAT-comments, unnecessary defensive checks. Fix them.

**4. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

**5. Testing standard:** Does every test step act through a public entry, assert an observable outcome, and carry a soundness check? Read each `it` aloud as `it <string>` — is it a sentence that answers the year-later failure question? Are the tests appropriate to the repository’s testing policy and the behavior being changed?

If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task.

## Plan Document Review

Use `plan-document-reviewer-prompt.md` when dispatching an independent plan reviewer, if subagents are available and permitted. Otherwise perform the same checklist yourself. Resolve blocking findings before handoff.

## Execution Handoff

Report the actual saved plan paths and summarize the sequence and any unresolved prerequisites. If implementation is already authorized, continue using the available execution workflow. Otherwise offer inline execution, and offer subagent execution only if it is supported. Do not require a named companion skill or a specific dispatch tool.
