# Plan: Newsletter Content Submission Form

## Overview

A new static Eleventy page providing a GOV.UK-styled HTML form for community members
to submit content (stories and links) for the newsletter. Submissions are persisted
as labelled GitHub Issues in a **separate private repository**
(`uk-x-gov-software-community/newsletter-submissions`).

On submit, users authenticate via GitHub OAuth Device Flow using only the narrow
`read:org` scope to prove org membership. The issue is then created by a **bot
service account** via a GitHub Actions `repository_dispatch` event — the user's
token never needs write access to any repository. The page runs on GitHub Pages
with no server-side component beyond GitHub's own infrastructure.

---

## Goals

- Community members can submit newsletter stories and links via a branded form
- Authentication via GitHub Device Flow proves org membership before submission
- Submissions are stored as GitHub Issues in a private repo, visible only to committee
- The user token has the minimum possible scope (`read:org` only)
- Fully accessible using GOV.UK Design System components
- Progressively enhanced: the page is usable without JavaScript

---

## Architecture Overview

```
Browser (GitHub Pages)                GitHub Infrastructure
──────────────────────                ───────────────────────────────────────────
1. User fills form
2. Device Flow OAuth ──────────────►  github.com/login/device/code
   (read:org scope only)              (via CORS proxy)
3. Verify org membership ───────────► api.github.com/orgs/.../members/{user}
4. Fire repository_dispatch ────────► api.github.com/repos/.../dispatches
   (public_repo scope, user token)    (public site repo)
                                             │
                                      GitHub Actions workflow
                                      triggered by dispatch event
                                             │
                                      Creates issue using ──────────► newsletter-submissions
                                      NEWSLETTER_BOT_TOKEN             (private repo)
```

The user's OAuth token only ever reads org membership and triggers a dispatch on
the **public** site repo (needing `public_repo` scope, not `repo`). Writing to the
private repository is done exclusively by the bot token stored as a GitHub Actions
secret — it is never exposed to the browser.

---

## New and Modified Files

| File | Action | Purpose |
|------|--------|---------|
| `newsletter-submit.md` | Create | Eleventy page with frontmatter and form markup |
| `assets/newsletter-submit.js` | Create | Progressive enhancement JS module |
| `tests/newsletter-submit.test.js` | Create | Unit tests (Vitest) |
| `eslint.config.js` | Create | ESLint flat config for linting JS assets |
| `vitest.config.js` | Create | Vitest configuration |
| `package.json` | Modify | Add test, lint scripts and dev dependencies |
| `.github/workflows/newsletter-dispatch.yaml` | Create | Receives dispatch, creates private issue |
| `.github/workflows/build.yaml` | Modify | Add lint + test step before build |

---

## Form Design

Page route: `/newsletter-submit/`

Fields — all optional per the spec:

| Field | Component | Type | Label |
|-------|-----------|------|-------|
| Name | `govuk-input` | text | "Your name (optional)" |
| Story | `govuk-textarea` | textarea | "Your story or update (optional)" |
| Link | `govuk-input` | url | "A relevant link (optional)" |
| — | `govuk-button` | submit | "Submit to newsletter" |

The form uses GOV.UK Design System classes already compiled into the site CSS via
`govuk-frontend`. All fields carry appropriate `autocomplete` attributes and
error-summary patterns for accessible inline validation.

---

## Progressive Enhancement Strategy

### Without JavaScript (baseline)

The form renders as a plain accessible HTML form. A `<noscript>` element explains
that JavaScript is needed for the OAuth step, and provides a fallback instruction
to email the committee or open a GitHub Issue manually. No data is submitted to
any server.

### With JavaScript (enhanced)

JavaScript intercepts the form submit event, validates inputs client-side, and
drives the full Device Flow → dispatch pipeline. The `<form>` element has no
`action` attribute so it never navigates without JS.

The JS is loaded as a non-blocking `<script type="module">`. All DOM manipulation
targets elements already present in the HTML; the script only progressively
enhances — it never creates elements essential for reading page content.

---

## Authentication: GitHub OAuth Device Flow

The Device Flow requires no `client_secret` in the browser, making it the only
viable OAuth flow for a purely static site.

### Scopes requested

| Scope | Reason |
|-------|--------|
| `read:org` | Verify the authenticated user is a member of `uk-x-gov-software-community` |
| `public_repo` | Trigger `repository_dispatch` on the public site repo |

This is a significant improvement over the `repo` scope (which grants full access
to all of a user's private repositories). `public_repo` is narrow and well-understood.

### Flow steps

1. User fills in optional fields and clicks **Submit to newsletter**.
2. JS `POST`s to the CORS proxy → `https://github.com/login/device/code` with
   `client_id` and scopes `read:org public_repo`.
3. GitHub returns `device_code`, `user_code`, `verification_uri`, `expires_in`,
   `interval`.
4. The page displays the `user_code` in a GOV.UK inset panel and opens
   `https://github.com/login/device` in a new tab automatically.
5. A live status region announces "Waiting for you to authorise on GitHub…".
6. JS polls the CORS proxy → `https://github.com/login/oauth/access_token` every
   `interval` seconds with `client_id` + `device_code` + device grant type.
7. On receiving `access_token`: verify membership.
8. `GET https://api.github.com/orgs/uk-x-gov-software-community/members/{username}`.
   - HTTP 204 → member, proceed.
   - HTTP 404 or 302 → not a member, show GOV.UK error panel, stop.
9. If member: `POST https://api.github.com/repos/uk-x-gov-software-community/uk-x-gov-software-community.github.io/dispatches`
   with `event_type: "newsletter-submission"` and `client_payload` containing the
   sanitised form fields and the submitter's GitHub username.
10. Show a GOV.UK confirmation panel: "Your submission has been received."
    No link to the private issue is shown.

### CORS considerations

`https://api.github.com` fully supports CORS (steps 8 and 9).

`https://github.com/login/device/code` and `https://github.com/login/oauth/access_token`
are on `github.com` and **do not send CORS headers**. A minimal Cloudflare Worker
(free tier) proxies only these two endpoints, adding `Access-Control-Allow-Origin: *`.
No secrets pass through the proxy — it forwards the request body verbatim.

If the proxy is unavailable the page degrades to the no-JS `<noscript>` fallback
instructions.

The proxy URL is a single constant at the top of `newsletter-submit.js`. The
Cloudflare Worker source (~15 lines) lives in `cloudflare-worker/` for
documentation; it is not part of the Eleventy build.

### OAuth App setup (one-time, manual)

Register an OAuth App under the `uk-x-gov-software-community` org:

- **Application name**: "Cross-Gov Software Community – Newsletter Submissions"
- **Homepage URL**: `https://uk-x-gov-software-community.github.io`
- **Device Flow**: enabled
- **Callback URL**: the form page URL (unused by Device Flow but required by GitHub)
- **Scopes at runtime**: `read:org public_repo`

The `client_id` is hardcoded in `newsletter-submit.js` (safe to expose publicly).
There is **no** `client_secret` in any file.

---

## GitHub Actions Dispatch Workflow

File: `.github/workflows/newsletter-dispatch.yaml`

```yaml
on:
  repository_dispatch:
    types: [newsletter-submission]

jobs:
  create-issue:
    runs-on: ubuntu-latest
    steps:
      - name: Generate GitHub App installation token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ secrets.NEWSLETTER_APP_ID }}
          private-key: ${{ secrets.NEWSLETTER_APP_PRIVATE_KEY }}
          owner: uk-x-gov-software-community
          repositories: newsletter-submissions

      - name: Create issue in private repo
        uses: actions/github-script@v7
        with:
          github-token: ${{ steps.app-token.outputs.token }}
          script: |
            const { name, story, link, github_username, submitted_at } = context.payload.client_payload
            await github.rest.issues.create({
              owner: 'uk-x-gov-software-community',
              repo:  'newsletter-submissions',
              title: `Newsletter Submission – ${submitted_at}`,
              labels: ['newsletter-submission'],
              body: formatBody({ name, story, link, github_username, submitted_at })
            })
```

The workflow uses a **GitHub App** to obtain a short-lived installation token at
runtime. The App's private key and App ID are stored as repository secrets; no
long-lived credential is ever used.

### GitHub App setup (one-time, manual)

1. Create a new GitHub App under the `uk-x-gov-software-community` org:
   - **Name**: "cgov-newsletter-bot"
   - **Homepage URL**: `https://uk-x-gov-software-community.github.io`
   - **Webhook**: disabled
   - **Repository permissions**: `Issues: write` only
   - **Where can this app be installed**: "Only on this account"
2. Generate and download a private key (PEM file).
3. Install the App on the `newsletter-submissions` repository only.
4. Add two secrets to the **public site repo**:
   - `NEWSLETTER_APP_ID` — the App's numeric ID (shown on the App settings page)
   - `NEWSLETTER_APP_PRIVATE_KEY` — the full contents of the downloaded PEM file

The workflow uses `actions/create-github-app-token` to exchange these for a
short-lived installation token at job start. The token is scoped to
`newsletter-submissions`, expires after 1 hour, and is never logged or exposed.

---

## GitHub Issue Schema

Issues created in `uk-x-gov-software-community/newsletter-submissions`:

```
Title:  Newsletter Submission – {YYYY-MM-DD}
Labels: newsletter-submission
Body:
  ## Newsletter Submission

  **Submitted by:** @{github_username} on {date}

  ### Name
  {name or "(not provided)"}

  ### Story / Update
  {story or "(not provided)"}

  ### Link
  {link or "(not provided)"}

  ---
  *Submitted via https://uk-x-gov-software-community.github.io/newsletter-submit/*
```

---

## Eleventy Integration

`newsletter-submit.md` uses standard frontmatter:

```yaml
---
layout: page.njk
title: Submit content for the newsletter
description: Share a story or link for inclusion in the next community newsletter.
---
```

No plugin changes are needed.

---

## Accessibility Requirements

- All form fields have visible, associated `<label>` elements.
- Error messages follow the GOV.UK error-summary + inline error pattern.
- The Device Flow user-code panel uses `aria-live="polite"` so screen readers
  announce the code without focus being forcibly moved.
- Polling status updates are in the same `aria-live="polite"` region.
- The confirmation panel uses `role="alert"` (assertive) as it replaces the form.
- Meets GOV.UK accessibility checklist and WCAG 2.2 AA.

---

## Linting

ESLint flat config (`eslint.config.js`) with:
- `@eslint/js` recommended rules
- `globals` package for browser/Node environments
- Targets `assets/newsletter-submit.js` and `tests/`

Run: `npm run lint`

---

## Testing

Vitest unit tests for pure functions in `newsletter-submit.js`:

| Function | Test cases |
|----------|-----------|
| `formatIssueBody(data)` | All fields provided; all empty; partial; XSS-safe output |
| `validateLink(url)` | Valid https URL; valid http URL; empty string; non-URL string |
| `buildIssueTitle(date)` | Expected title string for a given date |
| `buildDispatchPayload(formData, username, date)` | Correct shape; fields sanitised |
| `parseDeviceCodeResponse(json)` | Valid response parsed; missing fields handled |
| `isMemberResponse(status)` | 204 → true; 404 → false; 302 → false; other → throws |

Run: `npm test`

`package.json` test script updated from the current no-op to `vitest run`.
A `lint` script runs ESLint over the relevant files.

### CI

`.github/workflows/build.yaml` gains a step running `npm run lint && npm test`
before the build step, so every push is validated.

---

## Setup Checklist (before go-live)

- [ ] Create private `newsletter-submissions` repository in the org
- [ ] Create `newsletter-submission` label in `newsletter-submissions`
- [ ] Create GitHub App "cgov-newsletter-bot" in the org (Issues: write, webhook disabled)
- [ ] Install the App on `newsletter-submissions` repository only
- [ ] Download App private key (PEM)
- [ ] Add `NEWSLETTER_APP_ID` secret to the public site repo
- [ ] Add `NEWSLETTER_APP_PRIVATE_KEY` secret to the public site repo
- [ ] Register GitHub OAuth App in the org; record `client_id`
- [ ] Add `client_id` to `assets/newsletter-submit.js`
- [ ] Deploy Cloudflare Worker; add proxy URL constant to `newsletter-submit.js`
- [ ] Verify org membership check with a test account
- [ ] Test full end-to-end flow in a browser

---

## Out of Scope

- Sending the newsletter email (handled externally via Mailchimp)
- An admin UI for submissions (GitHub Issues UI in the private repo is sufficient)
- Server-side rendering or a persistent backend
- Storing form data outside of GitHub Issues
- Adding the page to the site navigation menu (to be decided separately)
