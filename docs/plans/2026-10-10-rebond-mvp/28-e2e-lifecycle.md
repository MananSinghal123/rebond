# End-to-End Lifecycle Test Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** One Playwright test that performs the §10 demo script in a real browser against a fresh database: Apply → Curate → Fund → Settle, from all three roles.

**Architecture:** REQUIREMENTS.md §10 (acceptance criteria 1–5) and §7 ("Playwright for one end-to-end lifecycle test"). Owner: `e2e/lifecycle.spec.ts`. Each role gets its own browser context, so sessions stay separate. The web server pushes a fresh `prisma/e2e.db` and enables `DEMO_DEV_TOOLS`. Locators use roles and labels only, so the test also checks the accessible names that NFR-2 depends on.

**Tech Stack:** @playwright/test (Chromium), Next.js dev server.

---

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/lifecycle.spec.ts`
- Modify: `package.json` (only if the `test:e2e` script from plan 01 is missing)

### Task 1: Playwright config

- [ ] **Step 1: Install the browser**

Run: `pnpm exec playwright install chromium`

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm prisma db push --force-reset --skip-generate && pnpm next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: 'file:./e2e.db',
      DEMO_DEV_TOOLS: '1',
      SESSION_SECRET: 'e2e-session-secret-at-least-32-characters',
    },
  },
});
```

- [ ] **Step 3: Confirm `package.json` has `"test:e2e": "playwright test"`**

Run: `node -e "console.log(require('./package.json').scripts['test:e2e'])"`
Expected: `playwright test`. If it prints `undefined`, add the script to the `"scripts"` block.

### Task 2: Lifecycle spec

- [ ] **Step 1: Write `e2e/lifecycle.spec.ts`**

```ts
import { expect, test, type Browser, type Page } from '@playwright/test';

type RoleName = 'Investor' | 'Company' | 'Curator';

const ROLE_HOME_GLOB: Record<RoleName, string> = { Investor: '**/portfolio', Company: '**/company', Curator: '**/curator' };

async function signUpAs(browser: Browser, email: string, role: RoleName, displayName = ''): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/onboarding');
  await page.getByRole('radio', { name: new RegExp(`^${role}`) }).check();
  await page.getByLabel('Company or display name').fill(displayName);
  if (role === 'Investor') await page.getByRole('checkbox', { name: /verified investor/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL(ROLE_HOME_GLOB[role]);
  return page;
}

async function invest(page: Page, bondUrl: string, amountUsd: string, expectedReturn: string) {
  await page.goto(bondUrl);
  await page.getByLabel('Amount (USD)').fill(amountUsd);
  await page.getByRole('button', { name: 'Review investment' }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirm investment' });
  await expect(dialog).toContainText(expectedReturn);
  await dialog.getByRole('button', { name: 'Confirm and fund' }).click();
  await expect(page.getByRole('status')).toContainText('Investment recorded');
}

test('a bond goes from application to maturity across all three roles', async ({ browser }) => {
  // §10.1: the company submits a $250k / 11% / 12-month / quarterly bond
  const company = await signUpAs(browser, 'acme@e2e.test', 'Company', 'Acme Clinics');
  await company.goto('/company/apply');
  await company.getByLabel('Description').fill('Outpatient clinics with contracted health-plan premiums.');
  await company.getByLabel('Raise amount (USD)').fill('250000');
  await company.getByLabel('Fixed annual rate (%)').fill('11');
  await company.getByLabel('Term (months)').fill('12');
  await company.getByLabel('Payout frequency').selectOption('QUARTERLY');
  await company.getByLabel('Contract summary').fill('Three-year capitation contract with a regional health plan.');
  await company.getByLabel('Annual contracted revenue (USD)').fill('1800000');
  await company.getByRole('button', { name: 'Submit for review' }).click();
  await company.waitForURL('**/company/bonds/**');

  // §10.2: the curator claims it, approves at a 1% fee, and it appears on /bonds
  const curator = await signUpAs(browser, 'atlas@e2e.test', 'Curator', 'Atlas Credit Review');
  await curator.getByRole('button', { name: 'Claim Acme Clinics' }).click();
  await curator.getByLabel('Curator fee (%)').fill('1');
  await curator.getByRole('button', { name: 'Approve and list' }).click();
  await curator.waitForURL('**/bonds/**');
  const bondUrl = new URL(curator.url()).pathname;
  await curator.goto('/bonds');
  await expect(curator.getByRole('link', { name: 'Acme Clinics' })).toBeVisible();

  // §10.3: two investors fund it in full, it becomes ACTIVE, 4 payouts are scheduled, chain events appear
  const first = await signUpAs(browser, 'ana@e2e.test', 'Investor');
  await invest(first, bondUrl, '150000', '$16,500');
  const second = await signUpAs(browser, 'ben@e2e.test', 'Investor');
  await invest(second, bondUrl, '100000', '$11,000');

  await expect(second.getByText('active', { exact: true })).toBeVisible();
  const schedule = second.getByRole('table', { name: 'Distribution schedule' });
  await expect(schedule.locator('tbody tr')).toHaveCount(4);
  await expect(second.getByText('Fully funded')).toBeVisible();

  // §10.4: advance time ×4 pays every distribution and the bond is MATURED
  for (let row = 0; row < 4; row += 1) {
    await second.getByRole('button', { name: 'Advance time' }).click();
    await expect(schedule.locator('tbody tr').nth(row)).toContainText('Paid');
  }
  await expect(second.getByText('matured', { exact: true })).toBeVisible();

  await first.goto('/portfolio');
  await expect(first.getByText('Received to date').locator('..')).toContainText('$166,500');

  // §10.5: the curator profile shows 1 bond, 100% on time and an updated rank
  await curator.goto('/curator');
  await curator.getByRole('link', { name: 'Public profile and rank' }).click();
  await expect(curator.getByText('Bonds curated').locator('..')).toContainText('1');
  await expect(curator.getByText('On-time distributions').locator('..')).toContainText('100%');
  await expect(curator.getByText('Rank score').locator('..')).toContainText('100');
});
```

- [ ] **Step 2: Run it**

Run: `pnpm test:e2e`
Expected: `1 passed`. The first run includes Next compile time (about 1–2 minutes).

- [ ] **Step 3: Soundness check**

In `lib/domain/schedule.ts`, change `QUARTERLY: 3` to `QUARTERLY: 4`.
Run: `pnpm test:e2e`. Expected: FAIL at `toHaveCount(4)` (3 rows).
Restore and re-run. Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts e2e/lifecycle.spec.ts package.json
git commit -m "test(e2e): full Apply → Curate → Fund → Settle demo script"
```
