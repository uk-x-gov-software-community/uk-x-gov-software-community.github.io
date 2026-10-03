# Hosting Umami for free

Umami needs two things:

* somewhere to run a Next.js app;
* a Postgres database.

GitHub Pages can't run either, so they're hosted elsewhere. Limits were checked in
October 2026. Free tiers change, so check them again before relying on them.

## Recommended: Vercel Hobby + Neon Free (£0)

| | Vercel Hobby (app) | Neon Free (database) |
| --- | --- | --- |
| Cost | Free, no card | Free, no card, no expiry |
| Main limits | 1M function invocations, 4 hours active CPU and 100 GB transfer a month | 0.5 GB storage, 100 compute-unit hours a month |
| Sleeps when idle? | No (serverless) | Compute suspends after 5 minutes idle and wakes in under a second |
| Catch | Personal, **non-commercial** use only, and **one member** per account | If compute hours run out, the database stops until next month |

Umami officially supports Vercel. It's the setup its own docs describe.

### Will it fit?

* **Storage.** Umami uses very roughly 1 KB per page view, including indexes. So
  0.5 GB holds several hundred thousand page views, which is years of traffic for
  a community site. Watch it on the Neon dashboard.
* **Compute hours.** Set the Neon compute to a fixed **0.25 CU** (minimum and
  maximum). That gives about 400 hours awake a month, roughly 13 hours a day. The
  database only wakes for page views and dashboard use, so traffic mostly in UK
  working hours fits comfortably. If you see the limit getting close, switch to
  Supabase (below).
* **Vercel CPU.** Each tracked page view takes a few milliseconds of CPU, so
  4 hours a month covers hundreds of thousands of views.

### The catches, and how this repo handles them

* **Non-commercial use.** The community is volunteer-run and non-commercial,
  which is what Hobby is for. If that changes, Vercel Pro costs $20 a month.
* **One Vercel member.** Only one person can sign in to the Hobby account. To
  avoid depending on them:
  * Deploys run from GitHub Actions with a token, so maintainers never need to
    sign in to Vercel.
  * Create the Vercel and Neon accounts with a shared community mailbox if you
    have one, not a personal address.
  * Keep the recovery details somewhere at least two admins can reach.
* **Ad blockers** block `script.js` from well-known analytics hosts. Use your own
  subdomain (e.g. `stats.uk-x-gov-software-community.org.uk`) and set
  `TRACKER_SCRIPT_NAME` (e.g. `insights.js`) to reduce this.

## Alternatives

| Option | Free? | Notes |
| --- | --- | --- |
| Vercel + **Supabase Free** | Yes | 500 MB Postgres with no compute-hour limit. Projects pause after a week with no activity, which a live site prevents. Use the connection pooler URL for `DATABASE_URL` and the direct URL for `DIRECT_DATABASE_URL`. |
| **Netlify** + Neon or Supabase | Yes | Umami ships a `netlify.toml`. The free plan uses monthly credits, so check them against your traffic. |
| **Google Cloud Run** + Neon | Usually | Uses the `umamisoftware/umami` Docker image and scales to zero. The free allowance covers this traffic, but it needs a billing account. Cold starts take a few seconds. |
| **Render** free web service | Partly | Spins down after 15 minutes idle with a slow cold start, so the first hits are lost. Render's free Postgres expires after 30 days, so pair it with Neon. |
| **Fly.io** | No | No free allowance for new organisations. |
| A department-provided VM | £0 to the community | Run `docker-compose.yml` with real secrets, behind HTTPS. More control, but someone has to patch it. |
| **Umami Cloud** | Free tier | Hosted by Umami's makers, not self-hosted. Free limits are low and team features are limited. |

If none of the free options suit, the cheapest reliable paid setup is a
€4–5 a month VM running `docker-compose.yml`.
