# ARCHITECTURE.md Format

Use the repository's existing architecture format when present. Otherwise use this template as a starting point, adapting it to the actual system. Keep the root reference short (target 100 lines or fewer); move detailed decisions into the repository's ADR location or component documents.

Architecture documentation owns structure, dependencies, consistency boundaries, and placement. The project's glossary or spec owns domain meanings. Do not require files named CONTEXT.md, CONTEXT-MAP.md, or docs/adr/ when the repository uses equivalents.

## Template

```markdown
# Architecture

## Status and evidence
State whether this is accepted or provisional. Cite the source documents and code paths.

## System overview
Describe the actual system, chain/execution model where relevant, and organizing approach.

## Principles
List concrete, checkable constraints adopted by this repository.
Distinguish accepted rules from proposed improvements.

## Components and ownership
| Component | Owns | Location | Public contract |
|-----------|------|----------|-----------------|

## Integration and dependencies
Describe allowed imports and runtime interactions separately.
Identify external services and the contracts between components.

## State and consistency boundaries
| Boundary | State owner | Invariants | Atomicity/recovery |
|----------|-------------|------------|--------------------|

## Module placement
| Kind of code | Actual location pattern | Owning component |
|--------------|-------------------------|------------------|

## Trust boundaries
Identify signing, authorization, custody, external-data validation, and privileged operations relevant to this system.

## Current drift
| Area | Drift/evidence | Target state | Status/task | Last reviewed |
|------|----------------|--------------|-------------|---------------|

## Related documents
Link to the actual glossary, ADRs, specifications, and component architecture documents.
```

Replace template instructions and populate tables from repository evidence when drafting a real architecture document. Omit inapplicable sections rather than inventing components.

## Principles and boundaries

- Prefer clear invariant ownership, focused modules, and pure domain calculations where the language and framework support them. Do not mandate class-based entities or a universal nesting limit.
- Apply DDD contexts, aggregates, and placement rules only when adopted. Consult [DDD-REFERENCE.md](DDD-REFERENCE.md) for that vocabulary.
- Preserve required atomicity. An on-chain transaction may intentionally update several records or components; verify the whole transition rather than forcing eventual consistency.
- Define amount units, precision, rounding, and asset-accounting ownership where applicable. Identify the authoritative source of state and how replicas recover from failure or delayed finality.
- Introduce interfaces for a concrete purpose such as an external integration, test seam, dependency inversion, or multiple adapters. Adapter count alone does not determine validity.
- Record permitted dependencies accurately. For dependency inversion, domain code owns or uses abstractions while infrastructure implements them; do not document an allowed domain-to-infrastructure import alongside a rule prohibiting it.

## Drift lifecycle

Record unresolved drift with evidence and its target state. Link a proposed task and mark the item planned after review. Keep it open until the fix is implemented and verified; proposing a task does not resolve drift. Omit the table when there is no known drift.

## Single and multiple components

Use a root ARCHITECTURE.md for a small system. For a larger repository, let the root explain cross-component structure and link to component documents. Do not create per-context architecture files solely to fit this template.

## Creating lazily

1. Inspect repository instructions, source boundaries, tests, existing design documents, and accepted decisions.
2. Draft a provisional reference of 50 lines or fewer containing observed principles, ownership, dependencies, and consistency boundaries.
3. Cite evidence and label uncertain assumptions explicitly. Use the draft for this review without treating it as accepted policy.
4. Continue authorized feature work. Surface unresolved decisions at handoff; if the request is review-only, present the proposed reference without writing it to the repository.
