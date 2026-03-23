# Plan: Newsletter Content Submission Form

## Overview

A new static Eleventy page providing a GOV.UK-styled HTML form for community members
to submit content (stories and links) for the newsletter. Submissions are persisted
as labelled GitHub Issues. On submit, users authenticate via GitHub OAuth Device Flow
to prove they are a member of the `uk-x-gov-software-community` GitHub organisation.
The page runs on GitHub Pages with no server-side component.

---

## Goals

- Community members can submit newsletter stories and links via a branded form
- Authentication via GitHub Device Flow proves org membership before submission
- Submissions are stored as GitHub Issues with a `newsletter-submission` label
- Fully accessible using GOV.UK Design System components
- Progressively enhanced: the page is usable without JavaScript

---

## New and Modified Files

| File | Action | Purpose |
|------|--------|---------|
| `newsletter-submit.md` | Create | Eleventy page with frontmatter and form markup |
| `assets/newsletter-submit.js` | Create | Progressive enhancement JS module |
| `tests/newsletter-submit.test.js` | Create | Unit tests (Vitest) |
| `eslint.config.js` | Create | ESLint configuration for linting JS assets |
| `vitest.config.js` | Create | Vitest configuration |
| `package.json` | Modify | Add test, lint scripts and dev dependencies |
| `menu.njk` | Modify | Add "Submit newsletter content" nav link |

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

The form uses GOV.UK Design System Nunjucks macros already available via
`govuk-eleventy-plugin`. All fields carry appropriate `autocomplete` attributes
and error-summary patterns for accessible inline validation.

---

## Progressive Enhancement Strategy

### Without JavaScript (baseline)

The form renders as a plain accessible HTML form. On submit the form action posts
to a static fallback URL (the same page with a `?fallback=1` query string). A
`<noscript>` element displays instructions to alternatively create a GitHub Issue
manually or email the committee. No data is lost; the experience degrades gracefully.

### With JavaScript (enhanced)

JavaScript intercepts the form submit event, validates inputs client-side, and
triggers the GitHub OAuth Device Flow (see below). The form is never actually
submitted to a server.

The JS is loaded as a non-blocking `<script type="module">` at the bottom of the
page. All DOM manipulation targets elements that already exist in the HTML;
the script only progressively enhances — it never creates elements that are
essential for reading the page content.

---

## Authentication: GitHub OAuth Device Flow

The Device Flow is the only OAuth flow that works in a purely browser-based
(no-server) context because it does **not** require a `client_secret` for the
token polling step.

### Flow steps

1. User fills in optional fields and clicks **Submit to newsletter**.
2. JS `POST`s to `https://github.com/login/device/code` with the OAuth App's
   `client_id` and scopes `read:org public_repo`.
3. GitHub returns `device_code`, `user_code`, `verification_uri`, `expires_in`,
   `interval`.
4. The page displays the `user_code` in a prominent GOV.UK-styled panel and opens
   `https://github.com/login/device` in a new tab automatically.
5. A status panel shows "Waiting for you to authorise on GitHub…".
6. JS polls `https://github.com/login/oauth/access_token` every `interval` seconds
   with `client_id` + `device_code` + `grant_type=urn:ietf:params:oauth:grant-type:device_code`.
7. On receiving `access_token`: proceed to membership check (step 8).
8. `GET https://api.github.com/orgs/uk-x-gov-software-community/members/{username}`
   using the token. HTTP 204 = member; HTTP 404 = not a member (show rejection
   message); HTTP 302 = requester is not themselves a member (treat as 404).
9. If member: `POST https://api.github.com/repos/uk-x-gov-software-community/uk-x-gov-software-community.github.io/issues`
   with the formatted submission body and label `newsletter-submission`.
10. Show a GOV.UK confirmation panel with a link to the created issue.

### CORS considerations

`https://api.github.com` fully supports CORS and is used for steps 8 and 9.

`https://github.com/login/device/code` and the token poll endpoint
(`https://github.com/login/oauth/access_token`) are `github.com` not `api.github.com`
and **do not send CORS headers**. Two mitigations are planned:

**Primary**: A minimal Cloudflare Worker (free tier) acting as a thin CORS proxy
for only these two OAuth endpoints. The Worker forwards the request, adds
`Access-Control-Allow-Origin: *`, and returns the response. The `client_id` is
public; no secrets pass through.

**Fallback**: If the Cloudflare Worker is unavailable the page degrades to the
no-JS experience (user is instructed to create an issue manually).

The proxy URL is stored in a single JS constant at the top of
`newsletter-submit.js` so it is easy to configure. The Cloudflare Worker source
(~15 lines) is included in a `cloudflare-worker/` directory in the repo for
documentation purposes but is not deployed by the Eleventy build.

### OAuth App setup (one-time, manual)

An OAuth App must be registered in the `uk-x-gov-software-community` organisation:

- **Application name**: "Cross-Gov Software Community – Newsletter Submissions"
- **Homepage URL**: `https://uk-x-gov-software-community.github.io`
- **Callback URL**: not required for Device Flow (can be set to the page URL)
- **Scopes requested at runtime**: `read:org public_repo`

The resulting `client_id` (safe to embed publicly) is hardcoded in
`newsletter-submit.js`. There is **no** `client_secret` in any file.

---

## GitHub Issue Schema

When a submission is accepted the JS creates an issue with:

```
Title:  Newsletter Submission – {ISO date}
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
  *Submitted via the newsletter form at https://uk-x-gov-software-community.github.io/newsletter-submit/*
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

No plugin changes are needed. The page uses existing GOV.UK Design System
classes (already compiled into the site's CSS via `govuk-frontend`).

---

## Accessibility Requirements

- All form fields have visible, associated `<label>` elements.
- Error messages follow the GOV.UK error-summary + inline error pattern.
- The Device Flow user-code panel uses `role="status"` and `aria-live="polite"` so
  screen readers announce the code without focus being moved.
- Polling status updates use `aria-live="polite"`.
- The confirmation panel uses `role="alert"` (assertive) since it replaces the form.
- The page passes the GOV.UK accessibility checklist and WCAG 2.2 AA.

---

## Linting

ESLint is added with:
- `eslint` + `@eslint/js` (flat config, `eslint.config.js`)
- `globals` package for browser/node globals
- Rules: `eslint:recommended` applied to `assets/**/*.js` and `tests/**/*.js`

Run: `npm run lint`

---

## Testing

Vitest is used for unit tests. Tests cover pure functions extracted from
`newsletter-submit.js`:

| Function | Test cases |
|----------|-----------|
| `formatIssueBody(data)` | All fields provided; all fields empty; partial fields; XSS-safe output |
| `validateLink(url)` | Valid http URL; valid https URL; empty string; non-URL string |
| `buildIssueTitle(date)` | Returns expected title string for a given date |
| `parseDeviceCodeResponse(json)` | Valid response parsed; missing fields handled |
| `isMemberResponse(status)` | 204 → true; 404 → false; 302 → false; other → throws |

Run: `npm test`

The `package.json` `test` script will be updated from its current no-op to
`vitest run`. A `lint` script runs `eslint assets/newsletter-submit.js tests/`.

### CI

The existing `.github/workflows/build.yaml` will be extended with a step that
runs `npm run lint && npm test` before the build step, ensuring submissions
are validated on every push.

---

## Setup Checklist (before go-live)

- [ ] Register GitHub OAuth App in the org; record `client_id`
- [ ] Add `client_id` to `assets/newsletter-submit.js`
- [ ] Deploy Cloudflare Worker and add proxy URL to `newsletter-submit.js`
- [ ] Create `newsletter-submission` label in the repository Issues
- [ ] Verify org membership check works with a test account
- [ ] Test the full flow end-to-end in a browser

---

## Out of Scope

- Sending the newsletter email (handled externally via Mailchimp)
- An admin UI to review/publish submissions (GitHub Issues UI is sufficient)
- Server-side rendering or a backend service
- Storing any form data outside of GitHub Issues
