# Hosting Decision and Week-1 Go/No-Go

**Decision status:** Proposed. Confirm after the week-1 spike described below.
**Scope:** Hosting for the yogseq web app (frontend, API, and Postgres) during the soft launch and first public release.

---

## 1. Decision

| Priority | Option | Role | Why |
|----------|--------|------|-----|
| **Primary** | Cloudflare Workers + Neon Postgres | Default path | Lowest expected cost at soft-launch scale; serverless Postgres scales to zero; Workers have a generous free tier. |
| **Fallback** | Vercel | One-day switch if Workers blocks us | Fastest path for Next.js-style apps; higher cost at scale but low setup effort. |
| **Third option** | AWS via SST | Only if we outgrow both | Full control, most ops work; reserve for a real scale or compliance need. |

**Rule:** do not spend more than **one day** trying to make Cloudflare work. If it fails the go/no-go criteria in section 4, switch to Vercel the same week.

---

## 2. Options Compared

| Dimension | Cloudflare Workers + Neon | Vercel (+ Neon) | AWS via SST |
|-----------|---------------------------|-----------------|-------------|
| Expected cost at soft-launch scale | Lowest (free or near-free tiers) | Low, but more likely to hit paid tiers sooner | Varies; more moving parts, more idle cost |
| Setup effort | Medium (Workers runtime constraints) | Low | High |
| Database | Neon (serverless Postgres, branching) | Neon or Vercel Postgres | RDS / Aurora Serverless or Neon |
| Cold starts / latency | Very low at the edge | Low | Depends on Lambda config |
| Node/runtime compatibility | Must verify (not all Node APIs available) | Full Node | Full Node |
| Vendor lock-in | Moderate (Workers APIs) | Moderate (Next.js-specific features) | Low (standard AWS) |
| Ops burden | Low | Low | High |
| Preview deploys | Supported | Excellent | Build your own |
| Exit path | Port Workers code to a Node server | Port to any Node host | Already on AWS |

---

## 3. Rationale

- **Cost first.** The product is free for teachers, so hosting cost is the main ongoing expense with no revenue offset. Cloudflare and Neon both have free or low-cost starter tiers that match a soft launch.
- **Database.** Neon's branching is useful for preview environments and keeps dev traffic off production compute.
- **Fallback is real.** Vercel is the one-day escape hatch if Workers runtime limits block a feature. Keep the app's data access behind a thin layer so swapping hosts does not touch business logic.
- **AWS is deferred.** SST is a good option if we need custom infrastructure later, but it adds ops work we do not need before there are users.

---

## 4. Week-1 Go/No-Go Criteria

Run a spike in week 1: deploy a minimal build (auth + create/save one sequence + one read query) to Cloudflare Workers with Neon. Measure against the criteria below.

### GO on Cloudflare Workers + Neon if all of these are true:

- [ ] **Runtime works:** the app builds and runs on Workers without patching core dependencies (ORM, auth library, framework). A one-day workaround is acceptable; more is not.
- [ ] **Database connects:** Neon connection works from Workers using the chosen driver, including connection pooling. Confirm a cold start of the first query is under **1 second** (proposed).
- [ ] **Latency:** p95 for a sequence load (API + DB) is under **300 ms** from two test locations (proposed).
- [ ] **Cost:** projected monthly cost at 500 teachers / 5,000 sequences is under **$25** (proposed). Cost model recorded in the soft-launch cost log.
- [ ] **Observability:** Sentry receives errors from the Worker runtime with readable stack traces.
- [ ] **Deploys:** preview deploys per branch work, and rollback to the previous version takes under 5 minutes.
- [ ] **Auth:** session handling works end-to-end, including logout and expiry.
- [ ] **Exit path documented:** a written note in this doc on what changes if we move to Vercel (estimated effort in hours).

### NO-GO (switch to Vercel) if any of these are true:

- [ ] Core dependency cannot run on Workers after one day of effort.
- [ ] Neon connection is unstable (repeated timeouts or connection exhaustion in a 30-minute load test).
- [ ] p95 latency exceeds **500 ms** after one day of tuning (proposed).
- [ ] Projected cost exceeds **$50/month** at the soft-launch model (proposed).
- [ ] Sentry integration cannot be made to report usable errors within one day.

### Decision record

| Date | Result (GO / NO-GO) | Measured p95 | Cold start | Projected cost | Blockers | Decider |
|------|---------------------|--------------|------------|----------------|----------|---------|
| 2026-10-30 | PENDING smoke | — | — | Soft-launch model under $25 target | Neon project `yogseq` migrated; CI deploy + Worker secrets + custom domain next. Interim host `yogseq.metierstudio.org` (`.com` still on Namecheap NS) | Operator |
| | | | | | | |

### Production target (Métier Studio)

- **URL:** `https://yogseq.metierstudio.com`
- **Runbook:** [`docs/metier-deploy.md`](metier-deploy.md)
- **Setup scripts:** `scripts/setup-production.ps1`, `scripts/setup-github-secrets.ps1`

### Rate limiting (Cloudflare)

In-app limiter (`apps/web/src/lib/rate-limit.ts`) is per Worker isolate only. For production:

1. Cloudflare Dashboard → **Security** → **WAF** (or **Rate limiting** rules) for zone `metierstudio.com`.
2. Create a rule matching hostname `yogseq.metierstudio.com` and URI Path starts with `/api/`.
3. Suggested starting threshold: 60 requests / 1 minute / IP → challenge or block (tune after soft launch).
4. Also consider a tighter rule on auth paths (`/api/auth/*`) if abuse appears.

### Billing alerts

Before inviting teachers:

1. **Cloudflare:** Billing → Notifications / Usage alerts at ~50% of Workers included quota (see `docs/soft-launch.md` §4).
2. **Neon:** Project → Monitoring / Billing → alert at ~50% of plan compute hours.
3. Record weekly totals in the soft-launch cost log.

---

## 5. Vercel Fallback Plan (one day)

1. Create a Vercel project from the same repo.
2. Point `DATABASE_URL` at the same Neon project (use a separate branch if needed).
3. Verify the app builds and the same smoke test passes.
4. Move the custom domain in Vercel and update DNS.
5. Record the switch in the decision record above.

---

## 6. AWS / SST (third option, deferred)

Use only if one of these becomes true:
- Sustained traffic makes Workers or Vercel cost more than managed AWS.
- A feature needs AWS-only services (for example, specific compliance or long-running jobs).
- Teacher data requires a region or certification the other hosts cannot provide.

Plan: SST for infrastructure as code, RDS or Aurora Serverless (or keep Neon) for Postgres.

---

## 7. Review

- Re-check this decision at the end of week 1 (go/no-go) and again after the first month of the soft launch.
- Update the cost log in `docs/soft-launch.md` weekly.
