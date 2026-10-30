# Yogseq × Métier Studio — Cloudflare Deploy Runbook

**Production URL (live interim):** `https://yogseq.metierstudio.org`  
**Production URL (target):** `https://yogseq.metierstudio.com` (after `.com` zone NS cutover — see DNS note)  
**Product brand:** Yogseq  
**Org attribution:** “by Métier Studio” → `https://metierstudio.com`  
**Runtime:** Cloudflare Workers (OpenNext) + Neon Postgres  
**Apex site:** Leave `metierstudio.com` architecture portfolio unchanged  

### Deploy mechanics (Windows)

| Topic | Current behavior |
|-------|------------------|
| OpenNext build | Cannot run on Windows (symlink `EPERM`). CI (GitHub Actions, Linux) builds and uploads the artifact `open-next-yogseq` on every push to `main`. |
| Deploy from Windows | `.\scripts\deploy-from-ci-artifact.ps1` downloads the artifact and runs `wrangler deploy`. It picks the latest completed CI run, or pass `-RunId <id>`. Requires `pnpm exec wrangler login` once. |
| Config-only changes | `wrangler deploy` with an existing `.open-next` folder re-deploys without rebuilding. This is how `vars` changes in `apps/web/wrangler.jsonc` are shipped. |
| CI deploy step | Wrangler OAuth tokens do not work as `CLOUDFLARE_API_TOKEN` in CI. Until a real API token is set as the GitHub secret, the CI deploy step is non-blocking and the artifact path is the deploy path. |

**Worker secrets currently set:** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://yogseq.metierstudio.org`.

### Finish deploy (operator — interactive Cloudflare auth)

These steps cannot be completed from a non-interactive agent session once Wrangler OAuth expires:

1. **Login:** in `apps/web` run `pnpm exec wrangler login` and approve in the browser.
2. **Deploy latest OpenNext artifact:**
   ```powershell
   .\scripts\deploy-from-ci-artifact.ps1
   ```
3. **Worker secrets** (from `apps/web`, paste Neon pooled URL + auth secret from your local `.env.local`):
   ```powershell
   pnpm exec wrangler secret put DATABASE_URL
   pnpm exec wrangler secret put BETTER_AUTH_SECRET
   pnpm exec wrangler secret put BETTER_AUTH_URL
   # value: https://yogseq.metierstudio.org
   ```
4. **Custom domain:** Dashboard → Workers → `yogseq` → Domains & Routes → Add → `yogseq.metierstudio.org`.
5. **CI API token (optional but preferred):** create [Edit Cloudflare Workers](https://dash.cloudflare.com/profile/api-tokens) token → `gh secret set CLOUDFLARE_API_TOKEN --repo jigargor/yogseq`.
6. **`.com` cutover:** add zone `metierstudio.com` to Cloudflare, point Namecheap NS at Cloudflare, recreate apex A `199.188.200.46`, attach `yogseq.metierstudio.com`, flip `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL`, rebuild.

**Already done:** Neon project `yogseq` + migrations; GitHub secrets for DB/auth; CI OpenNext build + `open-next-yogseq` artifact; Métier branding; runbooks/scripts.

### DNS note (required for `.com`)

As of 2026-10-30:

| Domain | DNS today | Cloudflare zone on deploy account? |
|--------|-----------|--------------------------------------|
| `metierstudio.com` | Namecheap (`dns1/dns2.registrar-servers.com`), apex A `199.188.200.46` | **No** — must be added before Workers custom domain |
| `metierstudio.org` | Cloudflare | **Yes** — can host `yogseq.metierstudio.org` immediately |

Workers custom domains require the hostname’s zone in the **same** Cloudflare account as the Worker. To serve `yogseq.metierstudio.com`:

1. Add zone `metierstudio.com` in Cloudflare (same account as Worker `yogseq`).
2. At Namecheap → Domain → Nameservers → Custom DNS → paste the two Cloudflare NS values.
3. Recreate apex records so the architecture site keeps working: `A @ → 199.188.200.46` (DNS-only / grey-cloud is fine).
4. Attach Worker custom domain `yogseq.metierstudio.com`.

Until NS cutover completes, use the `*.workers.dev` URL and/or `yogseq.metierstudio.org`.

### Incident: wrong site on yogseq.metierstudio.org

**Symptom (2026-10-30):** `https://yogseq.metierstudio.org` showed the Métier marketing site ("Movement practice. Clear scope. Show up.") instead of Yogseq.

**Cause:** the Cloudflare zone `metierstudio.org` has a wildcard Worker route `*.metierstudio.org/*` bound to the Worker `metier-studio-llc`. Worker routes run before Custom Domains, so the wildcard intercepted the hostname even though a Custom Domain `yogseq.metierstudio.org` -> Worker `yogseq` existed.

**Fix applied:** added a more specific route `yogseq.metierstudio.org/*` with **no Worker assigned** (script null) on zone `metierstudio.org`. A more specific route with no script excludes that hostname from the wildcard, so the request falls through to the Custom Domain origin, i.e. the `yogseq` Worker.

| Method | Steps |
|--------|-------|
| Dashboard | Workers & Pages -> Overview -> (zone) Routes, or Websites -> `metierstudio.org` -> Workers Routes -> Add route -> pattern `yogseq.metierstudio.org/*`, Worker: **None** |
| API | `POST /zones/{zone_id}/workers/routes` with body `{"pattern":"yogseq.metierstudio.org/*"}` (no `script` field) |

**Repeat for `.com`:** once the `metierstudio.com` zone is on Cloudflare, check for a wildcard Worker route on that zone. If one exists, add the same no-Worker route for `yogseq.metierstudio.com/*`.

**Verify:** `curl -I https://yogseq.metierstudio.org` and confirm the response is served by Yogseq, not the Métier site.

---

## Phase 0 — Requirements checklist

Fill every row before the first production invite. Do not invent missing values.

### Accounts and access

| Item | Status | Notes / value |
|------|--------|---------------|
| Cloudflare account owns zone `metierstudio.com` (Active) | [ ] | Same account that will host Worker `yogseq` |
| Permission to add Worker custom domain `yogseq.metierstudio.com` | [ ] | Auto-creates DNS + SSL |
| Neon project (production) | [ ] | Use **pooled** connection string |
| `DATABASE_URL` (Neon pooled) | [ ] | Secret — never commit |
| GitHub repo `jigargor/yogseq` Actions secrets access | [ ] | For CI deploy on `main` |
| Resend account + API key (optional; enables magic-link sign-in and the password-reset path) | [ ] | Without it, email/password sign-in still works; magic link is hidden from `/sign-in` |
| Resend From address decision | [ ] | Prefer verified domain, e.g. `Yogseq <login@metierstudio.com>` or Resend onboarding |
| Google OAuth client (optional) | [ ] | JS origin + redirect for `https://yogseq.metierstudio.com` |
| Cloudflare Web Analytics token (optional) | [ ] | `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` at **build** time |

### Product / legal / brand

| Item | Decision |
|------|----------|
| Public product name | **Yogseq** (interim per `docs/naming.md`) |
| Org line | Yogseq **by Métier Studio** → `https://metierstudio.com` |
| Legal pages (`/privacy`, `/terms`, `/disclaimer`) | Templates — review before public invite; soft-launch OK with caveat |
| Pose Studio writes in prod | **Off** (`ALLOW_STUDIO_WRITE` unset) |

### Technical constants

| Item | Value |
|------|-------|
| Public origin | `https://yogseq.metierstudio.com` |
| `BETTER_AUTH_URL` | `https://yogseq.metierstudio.com` |
| `NEXT_PUBLIC_APP_URL` | `https://yogseq.metierstudio.com` (bake-time) |
| Worker name | `yogseq` |
| Soft-launch gate | Auth + create/save/load sequence on Workers + Neon (`docs/go-no-go-hosting.md`) |

### Secrets: Worker runtime vs build-time

| Variable | Where it must be set | Notes |
|----------|----------------------|-------|
| `DATABASE_URL` | `wrangler secret put` | Runtime |
| `BETTER_AUTH_SECRET` | `wrangler secret put` | Runtime |
| `BETTER_AUTH_URL` | `wrangler secret put` | Runtime — production origin |
| `RESEND_API_KEY` | `wrangler secret put` | Optional runtime |
| `RESEND_FROM_EMAIL` | `wrangler secret put` | Optional runtime |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `wrangler secret put` | Optional runtime |
| `NEXT_PUBLIC_APP_URL` | CI / local env at **OpenNext build** | Inlined into client bundle |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | CI / local env at **build** | Optional |
| `ALLOW_STUDIO_WRITE` | Do **not** set in production | — |

GitHub Actions may mirror some secrets for the build job, but **Worker runtime secrets are not published by CI** — set them once with Wrangler (section D). Redeploy after any `NEXT_PUBLIC_*` change.

---

## Phase 2 — Push to Cloudflare (operator steps)

### A. Prerequisites (local)

1. Node 20+ or 22, pnpm 10 (`corepack enable`).
2. From `apps/web`: `pnpm exec wrangler login` (or use `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`).
3. Create a Neon project → copy the **pooled** `DATABASE_URL`.
4. Generate `BETTER_AUTH_SECRET`: `openssl rand -base64 32`.
5. Local env (dev): `cp apps/web/.env.example apps/web/.env.local` and fill values. Use `http://localhost:3000` for local auth URLs.

### B. Database

```bash
# from repo root, DATABASE_URL = Neon pooled URL
pnpm db:migrate
```

### C. First Worker deploy (CLI)

```bash
pnpm install
pnpm content:build
cd apps/web

# Windows PowerShell example for bake-time public URL:
$env:NEXT_PUBLIC_APP_URL = "https://yogseq.metierstudio.com"
$env:BETTER_AUTH_URL = "https://yogseq.metierstudio.com"
$env:BETTER_AUTH_SECRET = "<same-as-worker-secret>"   # needed if build reads it
pnpm deploy
```

Equivalent: `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.

### D. Worker secrets (runtime)

From `apps/web`:

```bash
pnpm exec wrangler secret put DATABASE_URL
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put BETTER_AUTH_URL
# paste: https://yogseq.metierstudio.com

pnpm exec wrangler secret put RESEND_API_KEY          # if using email
pnpm exec wrangler secret put RESEND_FROM_EMAIL
pnpm exec wrangler secret put GOOGLE_CLIENT_ID        # optional
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET    # optional
```

### E. Custom domain

1. Cloudflare Dashboard → **Workers & Pages** → worker **yogseq** → **Settings** → **Domains & Routes** → **Add** → **Custom domain** → `yogseq.metierstudio.com`.
2. Wait until Active (DNS + SSL). Confirm the apex architecture site is unchanged.
3. Open `https://yogseq.metierstudio.com` and confirm Yogseq loads.

If the zone lives in another Cloudflare account, attach the domain from the account that owns `metierstudio.com`, or transfer/zone-share first.

### F. Auth / email / OAuth after DNS

- Default sign-in is email + password (no third-party service needed). See [`docs/auth-plan.md`](auth-plan.md).
- Resend (optional): verify sending domain; set `RESEND_FROM_EMAIL`. Enables magic-link sign-in.
- Google Cloud Console (optional): authorized JS origin `https://yogseq.metierstudio.com` and Better Auth callback redirect for that origin.
- Smoke: create account → create sequence → save → reload → share page → mobile. Full auth checklist in `docs/auth-plan.md`.

### G. GitHub production path

Repo secrets / variables:

| Name | Type | Purpose |
|------|------|---------|
| `CLOUDFLARE_API_TOKEN` | secret | Workers deploy |
| `CLOUDFLARE_ACCOUNT_ID` | secret | Account targeting |
| `BETTER_AUTH_SECRET` | secret | Build/check + mirrored for ops |
| `BETTER_AUTH_URL` | secret | `https://yogseq.metierstudio.com` |
| `DATABASE_URL` | secret | Build job / ops (Worker still needs Wrangler secret) |
| `NEXT_PUBLIC_APP_URL` | variable or secret | Must be `https://yogseq.metierstudio.com` on deploy builds |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | secret | Optional analytics bake-in |

Token needs Workers Scripts Edit (and related) on the account. After the first successful manual deploy, push to `main` and confirm `deploy-production` runs.

**Preview deploys** (`wrangler versions upload`) must **not** bind `yogseq.metierstudio.com`. Use Workers preview URLs only.

### H. Hardening (same week)

- Cloudflare Rate Limiting or WAF custom rule matching `yogseq.metierstudio.com` path `/api/*` (in-app bucket is per-isolate only).
- Billing alerts: Cloudflare Workers usage + Neon compute (see `docs/soft-launch.md` §4).
- Record go/no-go measurements in `docs/go-no-go-hosting.md`.

### I. Rollback

- Workers → Deployments → roll back to previous version (target &lt; 5 minutes).
- To detach: remove the custom domain from the Worker (apex site stays intact).

---

## Automation scripts

| Script | Purpose |
|--------|---------|
| [`scripts/setup-production.ps1`](../scripts/setup-production.ps1) | `pnpm db:migrate` + OpenNext deploy + `wrangler secret put` |
| [`scripts/setup-github-secrets.ps1`](../scripts/setup-github-secrets.ps1) | `gh secret set` / `gh variable set` for CI |
| [`scripts/deploy-from-ci-artifact.ps1`](../scripts/deploy-from-ci-artifact.ps1) | Download CI `open-next-yogseq` artifact + `wrangler deploy` (OAuth OK) |

Repo variable (interim): `NEXT_PUBLIC_APP_URL=https://yogseq.metierstudio.org`.

### Cloudflare API token for GitHub Actions

`wrangler login` OAuth tokens **do not** work as `CLOUDFLARE_API_TOKEN` in CI (auth error 10000).

1. Dashboard → [API Tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token** → template **Edit Cloudflare Workers**.
2. Restrict to account `359089ac16b9342a1cf8f294edd92b9b` if prompted.
3. `gh secret set CLOUDFLARE_API_TOKEN --repo jigargor/yogseq` with the token value.
4. Until then, use `scripts/deploy-from-ci-artifact.ps1` after each green OpenNext build.

### Custom domain via API (optional)

With `CLOUDFLARE_API_TOKEN` + account id, after the Worker exists:

```bash
# List accounts / confirm worker, then attach custom domain in dashboard (recommended)
# or use Cloudflare API: PUT /accounts/{account_id}/workers/domains
```

Prefer the dashboard **Add Custom Domain** flow so SSL certificates provision automatically on the `metierstudio.com` zone.

### Runtime notes (Worker 500 fixes)

Two runtime failures were fixed on 2026-10-30. Both are recorded here so they are not reintroduced.

1. **Every route returned 500:** `Dynamic require of "/.next/server/middleware-manifest.json" is not supported`.
   - Known OpenNext Cloudflare issue with Next 16 (opennextjs-cloudflare issues [#1232](https://github.com/opennextjs/opennextjs-cloudflare/issues/1232) and [#1380](https://github.com/opennextjs/opennextjs-cloudflare/issues/1380)). Next's `getMiddlewareManifest()` uses a raw dynamic require that Workers cannot execute.
   - Workaround in place: `vars.NEXT_PRIVATE_MINIMAL_MODE = "1"` in `apps/web/wrangler.jsonc`. OpenNext already runs middleware in its own routing layer, and the app has no middleware/proxy file, so this is safe.
   - Remove the var once OpenNext ships a fix.
2. **`/api/auth/*` returned 500:** `TypeError: ... is not a function`.
   - Cause: better-auth's `toNextJsHandler(auth)` checks `"handler" in auth`. The lazy `auth` Proxy in `apps/web/src/lib/auth.ts` only had a `get` trap, so the check was false.
   - Fix: added `has`, `ownKeys`, and `getOwnPropertyDescriptor` traps to the Proxy. This would have failed in any environment, not only Workers.

**Diagnosis tip:** the browser only shows a bare 500. To see the real exception, run `pnpm exec wrangler tail yogseq --format json` from `apps/web` while hitting the URL.

---

## Success criteria

- [ ] `https://yogseq.metierstudio.com` serves Yogseq over HTTPS
- [ ] Sign-in + cloud save work against Neon
- [ ] UI shows Yogseq with “by Métier Studio” → metierstudio.com
- [ ] Apex architecture site unchanged
- [ ] Subsequent deploys: `git push` to `main` and/or `pnpm deploy`
