# ReBond MVP

Demo marketplace for fixed-return bonds backed by contracted revenue: **Apply → Curate → Fund → Settle**.
No real funds move, and on-chain records are simulated. Spec: [REQUIREMENTS.md](REQUIREMENTS.md). Plans: [docs/plans/2026-10-10-rebond-mvp](docs/plans/2026-10-10-rebond-mvp/00-overview.md).

## Run locally

```bash
pnpm install
cp .env.example .env            # then set SESSION_SECRET to `openssl rand -hex 32`
pnpm db:push && pnpm db:seed    # every seeded account uses the password "rebond-demo"
pnpm dev                        # http://localhost:3000
```

Sign-in options: **Continue with Google** (a demo that creates an account plus a demo embedded wallet), **connect a Cardano wallet** (real CIP-30: install Lace or Eternl, preferably on preprod, and sign a one-time message with no transaction or fee), or email and password.

Seeded accounts: `northwind@`, `harbor@`, `meridian@` (companies), `atlas@`, `juniper@` (curators), and `investor1@` to `investor3@`, all `@rebond.demo`.

## Assistant

A floating **Ask ReBond** chat, on every page and open to visitors, answers questions about how ReBond works using Claude. Set `ANTHROPIC_API_KEY` in `.env` to turn it on. Without a key the widget is hidden. `ASSISTANT_MODEL` overrides the default model (`claude-opus-5-5`).

It is FAQ-only. Its knowledge base is [lib/assistant/knowledge.ts](lib/assistant/knowledge.ts), which pulls amounts, fees and statuses from `lib/domain`. It can't see accounts, bonds or portfolios, and it points users to the right page for those. `/api/chat` is rate limited per IP, in memory (10 a minute, 100 a day). A multi-instance deploy needs a shared store instead.

## Test

```bash
pnpm test        # Vitest: pure domain + services against prisma/test.db, plus the assistant (no API calls)
pnpm test:e2e    # Playwright: the full demo script from REQUIREMENTS.md §10
```

## Demo script

1. Sign up as a company and submit a $250k / 11% / 12-month / quarterly bond at `/company/apply`.
2. Sign up as a curator, claim it at `/curator`, and approve it at a 1% fee.
3. Sign up as two investors and fund $150k and $100k at `/bonds/<id>`.
4. On the bond page, press **Advance time** 4 times. This needs `DEMO_DEV_TOOLS=1` and a signed-in user.
5. Check `/portfolio` and the curator's public profile.

## Deploy (Vercel + Postgres)

1. Create a Postgres database and copy its connection string.
2. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`. Commit this on the deploy branch.
3. In Vercel → Project → Settings → Environment Variables, set `DATABASE_URL` and `SESSION_SECRET` (32+ random chars). **Do not set `DEMO_DEV_TOOLS` on a public deploy**: any signed-in visitor could then pay out and mature bonds and mark payouts late, which rewrites curators' public ranks. Use it only for private demos. Set `SEED_PASSWORD` before seeding a shared database so the published demo password does not unlock the seeded curator and company accounts.
4. Create the schema and seed the demo data from your machine:
   ```bash
   DATABASE_URL="<postgres url>" pnpm prisma db push
   SEED_PASSWORD="<private password>" DATABASE_URL="<postgres url>" pnpm db:seed
   ```
5. Deploy: `vercel --prod`. The build runs `prisma generate && next build`.

The demo banner stays on every app page. Uploaded PDFs are stored in the database, capped at 5 MB in total per save.
