# Mauri

Maternity practice management for New Zealand midwives. A Next.js app on a self-hosted Supabase (Postgres and auth). Every database query runs as the signed-in midwife, under row level security; the browser never talks to the database directly.

## Setup

Requires Node 20 or later and pnpm.

    pnpm install

Create `.env.local` (git-ignored) with:

- `SUPABASE_URL`: the Supabase API address
- `SUPABASE_ANON_KEY`: the anon key
- `MAURI_GATEWAY_KEY`: the shared key the reverse proxy in front of the Supabase API requires on every request (header `x-mauri-gateway-key`)

These are server-only. Nothing is prefixed `NEXT_PUBLIC`, so none of it reaches the browser.

## Scripts

- `pnpm dev`: development server on port 3000
- `pnpm build` and `pnpm start`: production build and server
- `pnpm typecheck`, `pnpm lint`, `pnpm test`: type check, lint and unit tests
- `pnpm db:test`: pgTAP tests against a throwaway database (see `supabase/README.md`)
- `pnpm db:audit:test`: security audit of the test database's grants and policies
- `pnpm db:migrate`: apply pending migrations to staging
- `pnpm ops:invite`: invite a midwife (see `scripts/ops/README.md`)

## Layout

- `src/app`: routes. `(app)` holds the signed-in screens; `welcome` and `mfa` are the sign-in steps.
- `src/features`: screens and server actions by area (auth, onboarding, clients, cover, settings).
- `src/lib`: shared helpers (environment, Supabase client, request ids, dates, error messages).
- `src/proxy.ts`: runs on every page request: request id, Content-Security-Policy, session refresh.
- `supabase/migrations`: the schema, applied in order and never edited once applied.
- `public/sw.js`: retires a service worker an earlier build installed. The app registers none.
