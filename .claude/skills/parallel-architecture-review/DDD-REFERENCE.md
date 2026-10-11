# Domain-Driven Design Reference

Use this vocabulary when the current repository adopts DDD or the user requests DDD analysis. This reference does not impose DDD on every crypto project. Use the project's glossary/spec for names and its accepted architecture for constraints.

## Strategic design

| Term | Meaning | Review question |
|------|---------|-----------------|
| Bounded context | Boundary within which a domain model and vocabulary have a consistent meaning | Does integration preserve the intended meanings and ownership? |
| Context map | Description of relationships between contexts | Are the actual integration contracts and owners documented? |
| Ubiquitous language | Shared domain vocabulary used by contributors and code | Do names match the current glossary or spec? |
| Anti-corruption layer | Translation protecting one context's model from an external model | Does translation occur at the intended boundary? |
| Shared kernel | Deliberately shared model subset with coordinated ownership | Is its scope and change contract explicit? |

Context relationships can include partnership, customer-supplier, conformist, open host service, an anti-corruption layer, or a shared kernel. Select from actual integration needs; do not require events for every relationship. A shared kernel may contain agreed domain concepts, not only IDs and primitives.

## Tactical design

| Building block | Meaning |
|----------------|---------|
| Entity | Domain concept with identity over time |
| Value object | Immutable concept defined by values, such as an amount with an asset and unit |
| Aggregate | Consistency boundary grouping state and invariants under a root |
| Aggregate root | Public entry for operations on an aggregate |
| Domain service | Domain rule without a natural entity/value-object owner |
| Application service | Use-case orchestration, authorization coordination, persistence, and integration |
| Domain event | Fact that occurred in the domain, usually named in past tense |
| Integration event | Contract published across a component or context boundary |
| Repository | Persistence abstraction appropriate to the adopted aggregate model |

Behavior may be expressed as entity methods or functions over immutable data. Judge invariant enforcement and ownership, rather than whether a class has methods. Framework and chain constraints can legitimately change placement.

## Placement

Follow actual repository paths. A conventional dependency-inverted model puts domain rules and interfaces in domain modules, use-case orchestration in application modules, and persistence/API adapters in infrastructure modules. This is an example, not a required folder layout.

Domain code should not import concrete persistence or UI implementations when the project adopts this separation. Infrastructure may implement domain-owned abstractions. Distinguish source imports from the runtime call path.

## Checkable review rules

1. **Invariant ownership:** Identify which component enforces each invariant; ensure callers cannot bypass the public operation.
2. **Consistency boundary:** Preserve the documented atomicity requirement. One-aggregate transactions are a common DDD guideline, not a universal ban on atomic changes across aggregates. In crypto systems, splitting an atomic asset transition into eventual updates can break accounting or security.
3. **References:** Follow the project's identity and cross-context contracts. Avoid accidental shared mutable state; use IDs or explicit published contracts where required.
4. **Persistence:** Persist aggregates at their required consistency granularity. Read models and projections may use a different shape; do not flag them as violations merely for querying child data.
5. **Events:** Distinguish facts from requests. Use documented vocabulary and preserve event schemas consumed by other systems.
6. **Integration:** Translate incompatible external models at the intended seam. Define failure, retry, ordering, and reconciliation behavior where it affects correctness.
7. **Trust:** Check authorization, asset units, signing/custody boundaries, and external-data assumptions for the touched operations.

## Investigate before flagging

| Signal | Evidence needed |
|--------|-----------------|
| Rules scattered across services | A concrete invariant can be bypassed or drifts between implementations |
| Large aggregate | Unrelated state has conflicting ownership or unnecessary contention |
| Cross-context imports | An adopted boundary is violated without a shared-kernel contract |
| Persistence in domain logic | Concrete storage behavior breaks an adopted dependency rule or portability need |
| Raw identifiers or amounts | Actual ambiguity in identity, asset, units, precision, or validation |
| Extra abstractions | Cost with no current isolation, testing, integration, or reuse purpose |

Honor documented tradeoffs. Do not classify a pure functional model as anemic or remove an atomic transition simply because it crosses a conceptual aggregate boundary.

## Related documents

Use the current glossary/spec for meanings, ARCHITECTURE.md or its equivalent for accepted structure, and ADRs for decisions. Consult [ARCHITECTURE-FORMAT.md](ARCHITECTURE-FORMAT.md) when a provisional reference is needed.
