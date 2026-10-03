# Runbook

## First-time setup

### 1. Database (Neon)

1. Sign up at [neon.com](https://neon.com), with a shared community mailbox if you
   have one.
2. Create a project in a **UK or EU region** (e.g. AWS London `eu-west-2`).
3. Under **Branches → main → Compute**, set the size to a fixed **0.25 CU** (minimum
   and maximum). See [hosting.md](hosting.md#will-it-fit).
4. Copy two connection strings from **Connect**:
   * **Pooled** (host contains `-pooler`): this is `DATABASE_URL`.
   * **Direct** (pooling off): this is `DIRECT_DATABASE_URL`, used for migrations
     and backups.

### 2. App (Vercel)

1. Sign up at [vercel.com](https://vercel.com) on the Hobby plan.
2. Create an empty project from the dashboard. Don't connect it to a Git repo:
   GitHub Actions deploys it. Set **Framework Preset** to *Next.js* and **Node.js
   version** to 22.
3. Under **Settings → Environment Variables**, add these for *Production*:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon pooled connection string |
   | `DIRECT_DATABASE_URL` | Neon direct connection string |
   | `APP_SECRET` | output of `openssl rand -hex 32` |
   | `TWO_FACTOR_ENCRYPTION_KEY` | output of `openssl rand -hex 32` (needed for 2FA) |
   | `DISABLE_TELEMETRY` | `1` |
   | `TRACKER_SCRIPT_NAME` | e.g. `insights.js` (optional; serves the tracker at `/insights.js`, which ad blockers know less well) |

4. Under **Settings → Domains**, add `stats.uk-x-gov-software-community.org.uk`
   and create the DNS record Vercel shows.
5. Create a token under **Account Settings → Tokens**, scoped to this project's
   team. Find the org and project ids under **Project Settings → General**.

### 3. This repo

1. Under **Settings → Environments**, create `production` and add the other
   maintainers as **required reviewers**.
2. Add these **secrets** to the `production` environment:

   | Name | Value |
   | --- | --- |
   | `VERCEL_TOKEN` | the token from step 2.5 |
   | `VERCEL_ORG_ID` | Vercel team/org id |
   | `VERCEL_PROJECT_ID` | Vercel project id |
   | `BACKUP_DATABASE_URL` | Neon **direct** connection string |
   | `BACKUP_PASSPHRASE` | a long random passphrase, also stored where 2+ admins can reach it |

3. Add a repo **variable** `UMAMI_URL` = `https://stats.uk-x-gov-software-community.org.uk`
   (used by the smoke test).
4. Go to **Actions → deploy → Run workflow**. The first build creates the database
   tables.

### 4. Umami

1. Open the stats URL and sign in as `admin` / `umami`. **Change the password
   immediately** in the profile. Better still, create your own
   admin user and delete `admin`.
2. Turn on two-factor authentication for your account.
3. List the admins, managers and viewers in `access.yml`, then run
   `npm run access:sync -- --apply` ([access.md](access.md)). This creates the team.
4. In the **X-Gov Software Community** team's settings, add a website named *X-Gov Software Community* with domain
   `www.uk-x-gov-software-community.org.uk`. Because it belongs to the team, managers and
   viewers see it automatically. Copy its **Website ID**.
5. Add the tracking script to the community site
   ([site-integration.md](site-integration.md)).

## Upgrading Umami

1. Read the [release notes](https://github.com/umami-software/umami/releases).
   Look out for database migrations and new required environment variables.
2. Open a pull request that changes `UMAMI_VERSION`. Also update the image tag in
   `docker-compose.yml` (a test checks they match).
3. Optionally try it locally: `docker compose up -d`.
4. Merge. The **deploy** workflow runs and waits for a `production` reviewer.
   Migrations run during the build.

To roll back, redeploy the previous version by reverting the pull request. Vercel's
dashboard can also promote the previous deployment instantly. If the new release
ran a migration, restore the database from a backup (below) before rolling back.

## Backups

The **backup** workflow runs every Monday at 03:17 UTC, and you can also run it
by hand. It uploads `umami-YYYY-MM-DD.dump.gpg` as a workflow artifact and keeps
it for 90 days. Neon's own point-in-time restore is a second line of defence.

The dump includes Umami's password hashes. That's why it's encrypted, and why only
maintainers should have access to this repo.

### Restore

```bash
# download the artifact from the workflow run, then:
gpg --decrypt umami-YYYY-MM-DD.dump.gpg > umami.dump      # asks for BACKUP_PASSPHRASE
pg_restore --clean --if-exists --no-owner --no-acl -d "$DIRECT_DATABASE_URL" umami.dump
rm umami.dump
```

To check a backup without touching production, restore it into a new Neon branch,
or into the local `docker compose` database.

## Rotating secrets

* **`APP_SECRET`**: change it in Vercel and redeploy. Everyone is signed out.
* **Database password**: reset it in Neon. Then update `DATABASE_URL` and
  `DIRECT_DATABASE_URL` in Vercel, and `BACKUP_DATABASE_URL` here. Redeploy.
* **`VERCEL_TOKEN`**: create a new token, update the secret, then delete the old
  token.

## Locked out

If every admin has lost access, someone with the Neon credentials can reset a
password straight in the database. Generate a bcrypt hash and run:

```sql
update "user" set password = '<bcrypt hash>' where username = '<admin>';
```

Do this only as a last resort, and record it in an issue.
