<!-- Copilot / AI agent instructions for Driveby Africa -->
# Driveby Africa — Copilot instructions

Purpose: give an AI coding agent the minimal, actionable context to be productive in this repository.

- **Quick commands**
  - Install & dev: `npm install` then `npm run dev` (see [package.json](package.json)).
  - Build: `npm run build` and `npm run start` for local production.
  - E2E tests: `npm run test:e2e` (Playwright config in [playwright.config.ts](playwright.config.ts)).

- **Big picture architecture**
  - Frontend: Next.js App Router in the `app/` folder. Pages and server components live under `app/` (see [app/](app/)).
  - Data and auth: Supabase is the primary backend. Client helpers and server clients live in `lib/supabase/` and migrations are in `supabase/migrations/` (see [supabase/migrations](supabase/migrations)).
  - Server logic: Netlify Functions are used for serverless endpoints in `netlify/functions/` and configured by [netlify.toml](netlify.toml).
  - Background/ETL: `scripts/` contains sync and ETL scripts (encar, dongchedi, che168, dubicars). These are integration-heavy and referenced by CI workflows in `.github/workflows/`.
  - State: client state via `store/` (Zustand) and `lib/hooks` for React hooks.

- **Key integration points & external deps**
  - Supabase: secrets in env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`); server-only keys must not be exposed to the browser.
  - Image sources: allowed remote patterns are configured in [next.config.ts](next.config.ts#L1-L40) — add hosts here when integrating new CDNs.
  - AI / LLM SDKs: `@anthropic-ai/sdk`, `openai` and `@modelcontextprotocol/sdk` appear in `package.json` — check usages under `lib/` and `lib/notifications` before changing.
  - Caching / rate-limit: Upstash Redis and Upstash rate-limit are used (`@upstash/redis`, `@upstash/ratelimit`).

- **Project-specific conventions & patterns**
  - App Router + server/client split: prefer server components for data fetching at route-level; use `use client` at top of a file to mark client components.
  - UI organization: reusable primitives live in `components/ui/`; layout elements under `components/layout/`; domain components grouped by folder (e.g., `components/vehicles/`). Use existing patterns when adding features.
  - API placement: lightweight public endpoints use `app/api` (Next.js), and heavy/secret operations use Netlify functions in `netlify/functions/`.
  - Scripts: `scripts/` contains many external API sync tasks — changing these affects data ingestion and CI; check `.github/workflows/` for scheduled workers.

- **When editing code, pay attention to**
  - Environment separation: never move `SUPABASE_SERVICE_ROLE_KEY` or other service keys into client code.
  - Image host rules: update [next.config.ts](next.config.ts#L1-L40) when adding a new external image host.
  - Sync scripts & workflows: update `.github/workflows/*` if you change the shape or schedule of `scripts/*` jobs.
  - Tests: Frontend e2e tests live in `e2e/` and are Playwright-based; run `npm run test:e2e` to validate UI changes before merging.

- **Where to look for examples**
  - App router patterns: [app/layout.tsx](app/layout.tsx) and subfolders in `app/`.
  - Supabase client usage: `lib/supabase/` and `supabase/migrations/`.
  - Netlify functions: `netlify/functions/` and `netlify.toml`.
  - ETL / sync examples: `scripts/sync-dongchedi-ci.ts`, `scripts/sync-encar-ci.ts`.

If anything in this summary is unclear or missing (specific files, workflows, or conventions you want captured), tell me which areas to expand and I'll update this file.
