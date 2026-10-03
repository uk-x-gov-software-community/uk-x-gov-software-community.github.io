# X-Gov Software Community analytics

Self-hosted [Umami](https://github.com/umami-software/umami) web analytics for
[www.uk-x-gov-software-community.org.uk](https://www.uk-x-gov-software-community.org.uk).

Umami is open source (MIT) and cookieless: no cookies, no personal data, no
cross-site tracking. That keeps the community site free of a consent banner for
analytics.

This repo doesn't contain Umami's code. It pins an Umami release and holds everything
needed to run it:

| Path | What it does |
| --- | --- |
| `UMAMI_VERSION` | The Umami release that gets deployed. Change it by pull request to upgrade. |
| `access.yml` | Who can use the stats: admins, managers and viewers. |
| `scripts/sync-access.mjs` | Makes Umami's users and team match `access.yml`. |
| `.github/workflows/deploy.yaml` | Builds the pinned release and deploys it to Vercel. |
| `.github/workflows/backup.yaml` | Takes a weekly encrypted database backup, kept for 90 days. |
| `.github/workflows/ci.yaml` | Runs lint, unit tests and an `access.yml` check on every pull request. |
| `docker-compose.yml` | Runs the same version locally to try things out. |

## Can it run for free?

Yes. The recommended setup costs £0:

```
community site (GitHub Pages) ──script.js / collect──▶ Umami on Vercel Hobby ──▶ Postgres on Neon Free
```

* **Vercel Hobby** runs the Umami app.
* **Neon Free** runs the Postgres database.

Both are free with no card required, and both are well within limits for a community
site. Read the caveats (non-commercial use, database size, compute hours) and the
alternatives in [docs/hosting.md](docs/hosting.md).

## Multiple admins and viewers

Access is managed as code in [`access.yml`](access.yml), and changes go through
pull requests. An admin then runs `npm run access:sync -- --apply`.

| Role in `access.yml` | Can |
| --- | --- |
| `admins` | Do everything: users, teams, websites, settings. Keep 2–3 people here. |
| `managers` | Add or edit the community's websites, manage team members and see all stats. |
| `viewers` | See dashboards only. |

The details, including onboarding and offboarding, are in [docs/access.md](docs/access.md).

## First-time setup

Follow [docs/runbook.md § First-time setup](docs/runbook.md#first-time-setup). It
takes about 30 minutes:

1. Create a Neon project and a Vercel project.
2. Add the repo secrets and run the **deploy** workflow.
3. Change the default `admin` password and add the website.
4. Run the access sync.
5. Add the tracking script to the community site
   ([docs/site-integration.md](docs/site-integration.md)).

## Development

Needs Node 22 (see `.node-version`).

```bash
npm ci
npm run lint
npm test
npm run access:check      # validate access.yml

docker compose up -d      # local Umami on http://localhost:3000 (admin / umami)
UMAMI_URL=http://localhost:3000 UMAMI_USERNAME=admin UMAMI_PASSWORD=umami npm run access:sync
```
