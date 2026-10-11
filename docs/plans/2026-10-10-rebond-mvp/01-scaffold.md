# Scaffold and Tooling Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** Create the Next.js 15 + TypeScript + Tailwind v4 app in the repo root, with Vitest, Prisma 6, Zod, jose, bcryptjs, tsx and Playwright installed.

**Architecture:** REQUIREMENTS.md §7 (tech stack) and M1. There is no existing code: the repo holds only `REQUIREMENTS.md`, `.claude/` and `skills-lock.json`. `create-next-app` refuses non-empty folders, so we scaffold into the scratch directory and copy the result in. See [00-overview.md](00-overview.md) for the target layout.

**Tech Stack:** Next.js 15 (App Router, Turbopack dev), React 19, TypeScript, Tailwind CSS v4, pnpm, Vitest, Prisma 6, Zod, jose, bcryptjs, tsx, @playwright/test.

---

**Files changed by hand (generator output not counted):**
- Modify: `package.json` (scripts and pnpm build approvals)
- Create: `vitest.config.ts`
- Modify: `.gitignore`

### Task 1: Generate the Next.js app

- [ ] **Step 1: Scaffold into a temporary directory**

```bash
cd /home/manan/Desktop/rebond
SCAFFOLD=$(mktemp -d)/rebond
pnpm create next-app@15 "$SCAFFOLD" --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm --turbopack --yes
```

Expected: `Success! Created rebond at …`

- [ ] **Step 2: Copy it into the repo without overwriting the spec or `.claude/`**

```bash
rsync -a --exclude .git --exclude node_modules --exclude README.md "$SCAFFOLD"/ /home/manan/Desktop/rebond/
cd /home/manan/Desktop/rebond && ls
```

Expected: `app/ eslint.config.mjs next.config.ts package.json pnpm-lock.yaml postcss.config.mjs public/ tsconfig.json REQUIREMENTS.md …`

- [ ] **Step 3: Install the remaining dependencies**

```bash
pnpm add @prisma/client@6 zod jose bcryptjs
pnpm add -D prisma@6 vitest tsx @playwright/test
```

### Task 2: Scripts and pnpm build approvals

- [ ] **Step 1: Edit `package.json`**

Replace the `"scripts"` block. Add a `"pnpm"` block so Prisma's postinstall can run under pnpm 10, which blocks build scripts by default. Leave the dependency lists as pnpm wrote them.

```json
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "db:push": "prisma db push",
    "db:seed": "prisma db seed"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["@prisma/client", "@prisma/engines", "prisma", "esbuild", "sharp", "unrs-resolver"]
  },
```

- [ ] **Step 2: Re-run the install so the approved build scripts execute**

Run: `pnpm install`
Expected: no `Ignored build scripts` warning for the listed packages.

### Task 3: Vitest config

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': dirname(fileURLToPath(import.meta.url)) },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 2: Verify that Vitest boots**

Run: `pnpm vitest run --passWithNoTests`
Expected: `No test files found, exiting with code 0`

### Task 4: Ignore local artefacts

- [ ] **Step 1: Append to `.gitignore`**

`create-next-app` ignores `.env*`, which would also hide the committed `.env.example` (plan 07).

```bash
cat >> .gitignore <<'EOF'

# rebond
!.env.example
/prisma/*.db
/prisma/*.db-journal
/test-results
/playwright-report
EOF
```

### Task 5: Verify and commit

- [ ] **Step 1: Build and lint**

Run: `pnpm typecheck && pnpm lint && pnpm next build`
Expected: all three succeed. `next build` prints the route table with `○ /`.

- [ ] **Step 2: Commit**

```bash
git add -A -- . ':!REQUIREMENTS.md'
git commit -m "chore: scaffold Next.js 15 app with Vitest, Prisma, Zod, jose"
```
