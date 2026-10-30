# Yogseq × Métier Studio — Cloudflare Deploy Runbook

**Production URL (live interim):** `https://yogseq.metierstudio.org`  
**Production URL (target):** `https://yogseq.metierstudio.com` (after `.com` zone NS cutover — see DNS note)  
**Product brand:** Yogseq  
**Org attribution:** “by Métier Studio” → `https://metierstudio.com`  
**Runtime:** Cloudflare Workers (OpenNext) + Neon Postgres  
**Apex site:** Leave `metierstudio.com` architecture portfolio unchanged  

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
| Resend account + API key (optional but needed for magic-link email) | [ ] | Without it, links only appear in Worker logs |
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

- Resend: verify sending domain; set `RESEND_FROM_EMAIL`.
- Google Cloud Console: authorized JS origin `https://yogseq.metierstudio.com` and Better Auth callback redirect for that origin.
- Smoke: magic-link sign-in → create sequence → save → reload → share page → mobile.

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

---

## Success criteria

- [ ] `https://yogseq.metierstudio.com` serves Yogseq over HTTPS
- [ ] Sign-in + cloud save work against Neon
- [ ] UI shows Yogseq with “by Métier Studio” → metierstudio.com
- [ ] Apex architecture site unchanged
- [ ] Subsequent deploys: `git push` to `main` and/or `pnpm deploy`
