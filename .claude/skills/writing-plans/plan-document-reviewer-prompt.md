# Plan Document Reviewer Prompt Template

Use this template when dispatching a plan document reviewer after the complete plan is written. Adapt the invocation to the available subagent tool. If subagents are unavailable, apply this checklist yourself.

```text
You are a plan document reviewer. Verify this plan is complete and ready for implementation.

Plan to review: [PLAN_FILE_PATH]
Spec for reference: [SPEC_FILE_PATH]
Repository instructions: [RELEVANT_INSTRUCTION_PATHS]

Check:
- Completeness: no TODOs, placeholders, incomplete tasks, or missing steps.
- Spec alignment: covers requirements without major scope creep or imported business rules.
- Task decomposition: clear boundaries, actionable steps, dependencies, and at most three changed files per plan.
- Buildability: real paths, consistent types and interfaces, supported tools, and enough detail to implement.
- Validation: meaningful outcomes, appropriate tests, and relevant authorization and asset-accounting checks.

Only flag issues that would cause real implementation problems. Approve unless there are serious gaps, contradictions, placeholders, or tasks too vague to execute. Minor wording and stylistic preferences are advisory.

Return:
## Plan Review
Status: Approved | Issues Found

Issues (if any):
- [Task X, Step Y]: [specific issue] — [why it matters]

Recommendations (advisory, do not block approval):
- [suggestion]
```
