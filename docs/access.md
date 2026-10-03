# Access: admins, managers and viewers

Who can use the stats is defined in [`access.yml`](../access.yml). Umami is made
to match it by `scripts/sync-access.mjs`. Changes go through pull requests, so
there's a reviewed record of who was given access, when, and by whom.

## Roles

All the community's websites belong to one Umami team (the `team:` name in
`access.yml`).

| `access.yml` list | Umami global role | Umami team role | Can |
| --- | --- | --- | --- |
| `admins` | `admin` | none needed | Do everything: create and delete users, teams and websites, and change settings. |
| `managers` | `user` | `team-manager` | Add, edit or delete the team's websites, add or remove team members and see all stats. |
| `viewers` | `view-only` | `team-view-only` | See the dashboards and reports. They can't change anything. |

These permissions were checked against a running Umami 3.4.0:

* A viewer can read stats, but gets `401` when trying to edit a website, add one or
  add a team member.
* A manager can add websites to the team.

The admin who first creates the team becomes its **owner**. The sync never changes
or removes the owner.

Keep **2–3 admins** so access never depends on one person. `npm run access:check`
warns if there are fewer than 2.

## Asking for access

Open a pull request that adds your Umami username to `viewers` (or `managers`).
Use your GitHub handle in lower case. A maintainer reviews and merges it.

## Making the change (admins)

On your own machine (not CI, because it prints one-off passwords):

```bash
npm ci
export UMAMI_URL=https://stats.uk-x-gov-software-community.org.uk
export UMAMI_USERNAME=<your admin username>
npm run access:sync                 # dry run: shows what would change
npm run access:sync -- --apply      # makes the changes
```

It asks for your password, and for a two-factor code if you have 2FA turned on.
You can set `UMAMI_PASSWORD` and `UMAMI_TOTP` instead.

For each new user it prints a random one-off password. Send it to them over a
private channel, not in a GitHub comment. Ask them to:

1. sign in and change it in their profile;
2. turn on two-factor authentication, also in their profile.

If a run fails partway, it still prints the passwords of any users it had
already created. Fix the problem and run it again. It only makes the changes
that are still needed.

## When someone leaves

1. Remove them from `access.yml` by pull request.
2. Run `npm run access:sync -- --apply --prune`. This removes them from the team.
   Without `--prune`, the sync only reports people who aren't in the file.
3. The sync lists Umami users who aren't in `access.yml`. An admin deletes the
   person's user in Umami's admin settings. The sync never deletes users.

If an admin leaves, another admin runs the sync. The sync won't change the role
of the person running it.

## Public, read-only stats (optional)

To make the stats public without accounts, a manager or admin can turn on a
share link in the website's settings. Anyone with the link sees
the dashboard read-only. Turning the link off revokes it.
