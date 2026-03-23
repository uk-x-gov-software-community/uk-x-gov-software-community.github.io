# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Build the static site
npm run build

# Run local development server (port 8081)
npx @11ty/eleventy --serve --port=8081

# Build and run via Docker
npm run build:local:docker
```

There is no test or lint runner currently configured.

## Architecture

This is a static site built with [Eleventy (11ty)](https://www.11ty.dev/) using the [govuk-eleventy-plugin](https://x-govuk.github.io/govuk-eleventy-plugin/) for GOV.UK Design System styling and layout. Content is written in Markdown with Nunjucks (`.njk`) for templates and includes.

**Key files:**
- `.eleventy.js` — Eleventy config; sets up the govuk plugin, pass-through asset copies, and Nunjucks templating
- `_includes/` — Reusable Nunjucks components (cookie banner, nomination form, etc.) and SCSS/JS assets
- `sass/_settings.scss` — GOVUK frontend Sass overrides
- `assets/` — Static assets (images, logos, pre-built JS/CSS)

**Content structure:**
- Root-level `.md` files are top-level pages (e.g. `events.md`, `resources.md`)
- `blog/YYYY/MM/post.md` — Blog posts organised by date; `blog/index.njk` renders the listing
- `special-interest/` — Special interest group content with sub-pages and presentation slides

**Deployment:** Push to `main` triggers a GitHub Actions workflow (`.github/workflows/build.yaml`) that runs `npm ci && npm run build`, copies favicons into `_site/assets/images/`, then deploys to GitHub Pages via the `gh-pages` branch.

**Node version:** 22.22.0 (see `.node-version`).
