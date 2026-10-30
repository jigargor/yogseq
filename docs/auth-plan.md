# Auth Plan: Email and Password First

Status as of 2026-10-30.

## Goal

Teachers must be able to create an account and sign in on production today without any third-party service.

## Decision

Keep the current stack: better-auth + Drizzle + Neon (already works on Cloudflare Workers). Change the login **methods**, not the stack.

## Methods

| Method | Status | Availability |
|--------|--------|--------------|
| Email + password | Primary | Always on |
| Magic link (email) | Optional | Shown only when `RESEND_API_KEY` is set |
| Google OAuth | Optional | Shown only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set |

**Email + password settings:**

- `emailAndPassword` enabled.
- Minimum password length: 8.
- Auto sign-in after sign-up.
- Email verification is **not** required yet.
- The `account.password` column already exists, so no database migration is needed.

**Magic link:** the code stays in place. Previously the link was always shown in the UI, and in production it was only written to Worker logs. The UI now offers it only when Resend is configured.

**Google:** unchanged in code. Shown only when both client variables are set.

## UI

Route: `/sign-in`

- Two tabs:
  - **Sign in:** email, password.
  - **Create account:** name, email, password.
- `?next=/path` redirect is preserved. It is restricted to same-origin relative paths.
- Secondary button "Email me a sign-in link instead" appears only when magic link is enabled.
- "Continue with Google" appears only when Google is enabled.

## Server config

| Setting | Value |
|---------|-------|
| `trustedOrigins` | `https://yogseq.metierstudio.org`, `https://yogseq.metierstudio.com`, `http://localhost:3000` |
| Plugin order | `nextCookies()` stays last |
| Rate limiting | better-auth built-in limiter is in-memory (per Worker isolate), so it is best-effort only. A Cloudflare WAF rate-limit rule on `/api/auth/*` is still recommended. See `docs/go-no-go-hosting.md`. |

## Data

better-auth tables `user`, `session`, `account`, and `verification` are already migrated to the Neon project `yogseq`.

## Rollout and verification

Run the checklist in order.

| # | Step | Expected result |
|---|------|-----------------|
| 1 | `pnpm typecheck`, `pnpm lint`, `pnpm test` | All pass |
| 2 | Push to `main` | CI runs and uploads artifact `open-next-yogseq` |
| 3 | Deploy with `.\scripts\deploy-from-ci-artifact.ps1` | Worker updated |
| 4 | `curl https://yogseq.metierstudio.org/api/auth/ok` | `{"ok":true}` |
| 5 | `POST /api/auth/sign-up/email` with JSON `{name, email, password}` | HTTP 200 and a `set-cookie` header |
| 6 | `GET /api/auth/get-session` with that cookie | Returns the user |
| 7 | Browser: create account on `/sign-in` | Lands on `/library` |
| 8 | Browser: save a sequence from `/builder` | Sequence is saved |
| 9 | Browser: sign out, then sign back in | Library shows the saved sequence |

## Deferred

- Email verification and password reset. These need Resend or Cloudflare Email Service.
- Passkeys.
- Organization and team features. Already scaffolded by the better-auth organization plugin.

## Operator steps to enable optional providers

### Resend (magic link, and later password reset)

1. Create a Resend API key.
2. Verify a sending domain. Add the DNS records on the zone.
3. From `apps/web`, set the secrets:

   ```powershell
   pnpm exec wrangler secret put RESEND_API_KEY
   pnpm exec wrangler secret put RESEND_FROM_EMAIL
   ```

   `RESEND_FROM_EMAIL` example: `Yogseq <login@yourdomain.com>`.

4. Redeploy. Secrets do not require a rebuild, so the artifact deploy is enough.

### Google

1. In Google Cloud Console, create an OAuth client.
2. Authorized origin: `https://yogseq.metierstudio.org`.
3. Redirect URI: `https://yogseq.metierstudio.org/api/auth/callback/google`.
4. From `apps/web`, set the secrets:

   ```powershell
   pnpm exec wrangler secret put GOOGLE_CLIENT_ID
   pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET
   ```

5. Redeploy.
