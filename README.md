# Yogseq

Free yoga sequence builder for teachers: a drag-and-drop builder, clean stick-figure poses, print/share pages, and an optional cloud library.

Monorepo (pnpm workspaces):

| Path                | What it is                                                              |
| ------------------- | ----------------------------------------------------------------------- |
| `apps/web`          | Next.js 16 App Router app (shadcn/ui, Better Auth, Serwist PWA)         |
| `packages/figure`   | SVG figure renderer + FK/IK/mirror/landmark math                        |
| `packages/content`  | Pose/sequence schemas, taxonomy, catalog builder                        |
| `packages/db`       | Drizzle schema (Better Auth tables + `sequences`) and `createDb`        |
| `content/poses`     | Authored pose JSON (source of truth)                                    |
| `content/samples`   | Sample sequences                                                        |

## Setup

Requirements: Node 20+ and pnpm 10 (`corepack enable`).

```bash
pnpm install

# Build the pose catalog -> apps/web/public/catalog/poses.json
pnpm content:build

# Environment
cp apps/web/.env.example apps/web/.env.local   # then fill in the values below

# Database (Neon Postgres)
pnpm db:generate   # only when packages/db/src/schema.ts changed
pnpm db:migrate    # apply migrations to DATABASE_URL

pnpm dev           # http://localhost:3000
```

### Environment variables (`apps/web/.env.local`)

| Variable                         | Required | Notes                                                              |
| -------------------------------- | -------- | ------------------------------------------------------------------ |
| `DATABASE_URL`                   | yes      | Neon connection string (pooled)                                    |
| `BETTER_AUTH_SECRET`             | yes      | Long random string (`openssl rand -base64 32`)                     |
| `BETTER_AUTH_URL`                | yes      | Public origin, e.g. `http://localhost:3000`                        |
| `NEXT_PUBLIC_APP_URL`            | yes      | Same origin, used by the browser auth client                       |
| `RESEND_API_KEY`                 | no       | Magic-link emails. Without it the link is printed to the server log |
| `RESEND_FROM_EMAIL`              | no       | e.g. `Yogseq <login@yourdomain.com>`                               |
| `GOOGLE_CLIENT_ID` / `_SECRET`   | no       | Enables "Continue with Google" on `/sign-in`                       |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | no       | Cloudflare Web Analytics token; beacon is skipped when unset       |
| `ALLOW_STUDIO_WRITE`             | no       | `1` allows Pose Studio saves outside `NODE_ENV=development`        |

The app builds without any of these; auth and library features need the database and secret at runtime.

## Pose Studio (dev tool)

`/studio/poses` lists published poses; `/studio/poses/<slug>` is the rig editor (FK/IK dragging, mirror, layers, photo import with MediaPipe, metadata). **Save** writes `content/poses/<slug>.json` at the repo root and is only allowed when `NODE_ENV=development` (or `ALLOW_STUDIO_WRITE=1`); otherwise the API returns `403`. After editing run `pnpm content:build` to refresh the catalog.

## Scripts

```bash
pnpm typecheck       # all packages
pnpm test            # all packages
pnpm lint
pnpm content:build   # pose catalog
pnpm format
```

## Deploy (Cloudflare Workers + Neon)

**Production (interim):** [yogseq.metierstudio.org](https://yogseq.metierstudio.org) — Métier Studio offering.  
**Target:** `yogseq.metierstudio.com` after the `.com` zone is moved to Cloudflare (Namecheap NS today). Apex architecture site stays unchanged. See [`docs/metier-deploy.md`](docs/metier-deploy.md).

Hosting uses [OpenNext for Cloudflare](https://opennext.js.org/cloudflare) (`apps/web/wrangler.jsonc`). Full checklist and operator steps: [`docs/metier-deploy.md`](docs/metier-deploy.md).

1. Create a Neon project, set `DATABASE_URL`, and run `pnpm db:migrate` against it.
2. Set secrets on the Worker (`wrangler secret put` from `apps/web`): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://yogseq.metierstudio.com`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and optional `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Set `NEXT_PUBLIC_APP_URL=https://yogseq.metierstudio.com` at **build** time (not via Worker secrets).
3. Build and deploy:

   ```bash
   pnpm content:build
   pnpm preview   # local Workers preview
   pnpm deploy    # opennextjs-cloudflare build && deploy
   ```

4. Attach the custom domain in the Cloudflare dashboard: Worker `yogseq` → Domains & Routes → `yogseq.metierstudio.com`.

See `docs/go-no-go-hosting.md` for the Vercel fallback.

### Notes

- **Rate limiting** (`apps/web/src/lib/rate-limit.ts`) is an in-memory token bucket per IP, shared only within a single Worker isolate. It is best-effort; add a Cloudflare Rate Limiting rule for real enforcement on `/api/*` and share/fork actions.
- **Legal pages** (`/privacy`, `/terms`, `/disclaimer`) are unreviewed templates. Have them reviewed before public launch.
- **PWA:** `src/sw.ts` is compiled by `@serwist/next` to `public/sw.js` (disabled in development); the manifest is `public/manifest.webmanifest`. Replace the placeholder SVG icons in `public/icons` with final artwork (PNG icons are recommended for iOS).
