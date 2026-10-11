# Dev Advance-Time Control Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** An "Advance time" panel on active bond pages that pays the next distribution. It is shown only to signed-in users, and only when `DEMO_DEV_TOOLS=1`.

**Architecture:** REQUIREMENTS.md FR-24 (a dev-only "Advance time" control *or* `/api/dev/tick`; we build only the control) and §10 step 4 ("Advance time × 4"). Owner: `advanceTimeAction` in `app/(app)/bonds/[id]/actions.ts`, which delegates to `payNextDistribution` (plan 21). There is no HTTP route, so the dev tool cannot be called anonymously. Owner of the flag check: `lib/auth/dev-tools.ts`. The action re-checks `devToolsEnabled()` and `requireSession()` itself (NFR-4), so a stale page or a hand-crafted POST cannot bypass the gate. `DEMO_DEV_TOOLS` must never be set on a public deploy (plan 29 says so). The double-payment race is handled in the service (plan 21).

**Tech Stack:** Next.js 15 server actions.

---

**Files:**
- Create: `lib/auth/dev-tools.ts`
- Modify: `app/(app)/bonds/[id]/actions.ts`
- Modify: `app/(app)/bonds/[id]/page.tsx`

### Task 1: Advance-time action

- [ ] **Step 1: Create `lib/auth/dev-tools.ts`**

A plain module (not `'use server'`), so the flag check is not exposed as a callable endpoint.

```ts
export const devToolsEnabled = () => process.env.DEMO_DEV_TOOLS === '1';
```

- [ ] **Step 2: Add to `app/(app)/bonds/[id]/actions.ts`**

Change the session import to `import { requireActor, requireSession } from '@/lib/auth/session';`, and add `import { devToolsEnabled } from '@/lib/auth/dev-tools';`, `import { assert } from '@/lib/domain/types';` and `import { payNextDistribution } from '@/lib/services/settlement';`. Then append:

```ts
export async function advanceTimeAction(formData: FormData) {
  assert(devToolsEnabled(), 'dev tools are disabled');
  await requireSession();
  const bondId = String(formData.get('bondId'));
  const result = await payNextDistribution(bondId, { late: formData.get('late') === 'on' });
  if (!result.ok) redirect(`/bonds/${bondId}?error=${encodeURIComponent(result.error)}`);

  revalidatePath('/portfolio');
  redirect(`/bonds/${bondId}`);
}
```

The success redirect also clears any leftover `?error=` or `?funded=` notice.

### Task 2: Panel on the bond page

- [ ] **Step 1: Edit `app/(app)/bonds/[id]/page.tsx`**

Change the actions import to `import { advanceTimeAction, attestAction, fundAction } from './actions';` and add `import { devToolsEnabled } from '@/lib/auth/dev-tools';`. (`Button` is already imported by plan 24.)

Add this component above `export default async function BondPage`:

```tsx
function AdvanceTime({ bondId }: { bondId: string }) {
  return (
    <Panel title="Demo control: advance time">
      <form action={advanceTimeAction} className="flex flex-wrap items-center gap-4">
        <input type="hidden" name="bondId" value={bondId} />
        <Button variant="secondary">Advance time</Button>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="late" className="accent-[var(--color-accent)]" />
          Mark this payout as late
        </label>
      </form>
      <p className="mt-2 text-xs text-muted">Pays the next scheduled distribution pro-rata to every position.</p>
    </Panel>
  );
}
```

In `BondPage`, after `const remainingCents = …`, add:

```tsx
  const showAdvanceTime = status === 'ACTIVE' && session !== null && devToolsEnabled();
```

Directly before `<Panel title="Distribution schedule">`, insert:

```tsx
      {showAdvanceTime && <AdvanceTime bondId={bond.id} />}
```

### Task 3: Verify and commit

`payNextDistribution` (including the double-click guard) is integration-tested in plan 21. Plan 28 clicks this control four times end to end.

- [ ] **Step 1: Typecheck, lint and run the suite**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all pass.

- [ ] **Step 2: Manual check**

Run: `pnpm dev` with `DEMO_DEV_TOOLS=1` in `.env`. Fund a listed bond to 100%.
- Signed in: the "Demo control: advance time" panel appears. Click **Advance time** 4 times. Expected: the rows turn "Paid" one by one, then the status shows Matured and the panel disappears.
- Double-click **Advance time** quickly on a fresh active bond. Expected: each click pays at most one distribution and no distribution is ever paid twice (each row shows a single payout per position in `/portfolio`).
- Signed out: the panel is not rendered.
- Restart with `DEMO_DEV_TOOLS` unset. Expected: the panel never renders.

- [ ] **Step 3: Commit**

```bash
git add lib/auth/dev-tools.ts "app/(app)/bonds/[id]/actions.ts" "app/(app)/bonds/[id]/page.tsx"
git commit -m "feat(dev): session-gated advance-time control on active bonds"
```
