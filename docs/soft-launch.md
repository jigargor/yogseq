# Soft Launch Checklist

Goal: get a small group of yoga teachers using yogseq for real sequences, collect structured feedback, and watch costs and errors before any public launch.

---

## 1. Pre-Launch Checklist

- [ ] Production deploy is live on the hosting platform chosen in `docs/go-no-go-hosting.md`.
- [ ] Sign-up, login, create sequence, edit, and save all work on mobile and desktop.
- [ ] Sentry error monitoring receives a test error from production.
- [ ] Cost alerts configured (Cloudflare and Neon). See section 4.
- [ ] Feedback form is live and linked from inside the app.
- [ ] Privacy notice and terms are published (teachers will store client-adjacent data).
- [ ] Backup/export of a sequence works (teachers will ask for this first).
- [ ] Product name in UI is "Yogseq" (see `docs/naming.md`, section 6).

---

## 2. Feedback Intake Form

Use one form (Tally, Google Forms, or a self-hosted form). Keep it under 3 minutes. Ask in this order:

**Section A: About you (optional but useful)**
1. How long have you been teaching? (`<1 yr` / `1–3` / `3–10` / `10+`)
2. Where do you teach? (in-person studio / online / both)
3. What do you currently use to build sequences? (paper / notes app / Tummee / other)

**Section B: Your experience**
4. How long did it take you to build your first sequence? (minutes)
5. What was the hardest part? (free text)
6. Would you use this for your next class? (yes / probably / no / unsure)
7. What is the one thing you would add first? (free text)
8. What would stop you from using it? (free text)

**Section C: Scoring (1–5)**
9. Ease of building a sequence
10. Speed of building a sequence
11. Clarity of the pose library
12. Trust that your data is safe

**Section D: Permission**
13. May we contact you for a 20-minute follow-up call? (yes / no)
14. Can we quote you (anonymized, with your permission)? (yes / no)

**Ideas for in-app prompts**
- A small "Send feedback" link on the sequence-save screen (context-aware: captures the current route).
- A one-question prompt after the 3rd saved sequence: "How did that go?" with thumbs up/down and an optional comment.

---

## 3. Reddit Post Draft (r/YogaTeachers)

> Before posting: read the subreddit's rules on self-promotion and project posts. Post as a person, not a brand account. Do not post the same text to multiple subreddits on the same day.

**Title:** I'm building a free yoga sequence builder for teachers. Would love honest feedback from people who teach.

**Body:**

Hi all, I teach [your teaching context, e.g. "weekly vinyasa classes"] and got frustrated with how I plan sequences. I've been building **Yogseq**, a free web app for building and saving yoga sequences.

It's still early. I'm looking for a small group of teachers (5–10 for now) to try it with a real class and tell me what's broken or missing. I'm especially interested in:

- How long it takes you to build a sequence compared to your current method
- What you'd want to add first
- Whether anything about it would make you not trust it

It's free, and I'll never charge teachers to build sequences. If you're interested, comment or DM me and I'll send you an invite.

Happy to answer questions about how it works, what I'm storing, and what's on the roadmap.

---

## 4. Cost Dashboard Notes

Track these weekly during the soft launch. Keep a simple table in a spreadsheet or the team notes.

| Service | Where to look | What to track | Alert threshold (proposed) |
|---------|---------------|---------------|----------------------------|
| Cloudflare Workers | Dashboard → Workers & Pages → Usage | Requests/day, CPU time, error rate | Alert at 50% of the monthly included quota |
| Cloudflare (other) | Billing → Usage | Any paid add-on usage | Any unexpected line item |
| Neon Postgres | Neon console → Project → Monitoring / Billing | Compute hours, storage (GB), data transfer | Alert at 50% of plan compute hours |
| Neon branches | Neon console → Branches | Idle or forgotten dev branches | Delete any branch unused for 14 days |
| Sentry | Stats / Quota | Events per month vs. free tier | Alert at 70% of event quota |

**Cost hygiene:**
- Set billing alerts before the first teacher signs up.
- Keep dev and preview databases on separate Neon branches so they do not consume production compute.
- Cap Sentry sampling (for example 20% of traces) to stay in the free tier.
- Record the monthly total in this doc every Friday during the soft launch.

**Weekly cost log**

| Week | Cloudflare | Neon | Sentry | Total | Notes |
|------|-----------|------|--------|-------|-------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |

---

## 5. Error Monitoring (Sentry)

- [ ] Sentry project created for the web app.
- [ ] Source maps uploaded on each deploy so stack traces are readable.
- [ ] `environment` tag set to `production`, `preview`, or `development`.
- [ ] `release` tag set to the git commit SHA.
- [ ] User context limited to an anonymous teacher ID. No emails or names in Sentry.
- [ ] Breadcrumbs scrubbed of sequence content (teacher data stays out of error reports).
- [ ] Alert rule: notify on the first occurrence of any new issue in production.
- [ ] Alert rule: notify when error count in production exceeds a set threshold in 1 hour.
- [ ] Weekly review: triage new issues, close or assign each one.

---

## 6. Teacher Invite List Template

Keep this in a private spreadsheet, not in the repo. Columns:

| # | Name | Contact (email or handle) | Source | Teaching context | Invited on | Invite status | Activated (Y/N) | Sequences built | Feedback received | Notes |
|---|------|---------------------------|--------|------------------|------------|---------------|-----------------|-----------------|-------------------|-------|
| 1 | | | Friend / Reddit / Studio / Other | In-person / Online / Both | | Sent / Accepted / Declined | | | | |
| 2 | | | | | | | | | | |
| 3 | | | | | | | | | | |

**Guidelines:**
- Aim for 10–20 invites to get 5–10 active teachers.
- Mix in-person and online teachers, and at least one teacher who uses Tummee today.
- Send invites in batches of 5 so you can fix problems before the next batch.
- Follow up with anyone who has not activated within 3 days. One message, no more.
- Never add an invitee to a mailing list without explicit consent.
