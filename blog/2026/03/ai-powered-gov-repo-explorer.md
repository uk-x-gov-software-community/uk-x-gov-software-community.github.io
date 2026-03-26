---
layout: page.njk
title: "Building an AI-powered explorer for government open source repositories"
tags: post
categories: ["community", "open-source", "ai", "tools", "2026"]
date: 2026-03-26
excerpt: "The xgov repo scraper gives us data on 24,500+ government repositories. Here's how you could build a tool on top of it — filtering by tech stack and using AI to surface patterns useful to your team."
author: Cross Government Software Engineering Community
---

The [xgov Open Source Repo Scraper](https://github.com/uk-x-gov-software-community/xgov-opensource-repo-scraper) already does the hard work of cataloguing over 24,500 UK government open source repositories and publishing that data as JSON, updated nightly. What if you could go further — filter that list by the technical stack your team actually uses, then let AI analyse those repos and tell you what's worth borrowing?

Here's a concrete proposal for how you could build exactly that.

---

## What the scraper gives you

The scraper publishes a single JSON file — `repos.json` — updated every night via GitHub Actions. It is a plain array of repository objects, no authentication required:

```json
{
  "owner": "alphagov",
  "name": "govuk-frontend",
  "description": "The GOV.UK Design System Frontend",
  "url": "https://github.com/alphagov/govuk-frontend",
  "archived": false,
  "isFork": false,
  "language": "JavaScript",
  "stargazersCount": 1423,
  "forksCount": 312,
  "openIssuesCount": 47,
  "license": { "key": "mit", "name": "MIT License", "spdxId": "MIT" },
  "createdAt": "2017-08-09T08:49:00Z",
  "updatedAt": "2026-03-24T10:00:00Z",
  "pushedAt": "2026-03-20T14:30:00Z",
  "sbom": "sbom/alphagov/govuk-frontend.json.gz"
}
```

The scraper covers organisations from three source lists: UK Central government, UK Councils, and UK Research organisations. The `sbom` field — where present — is a bonus: a link to a gzip-compressed SPDX Software Bill of Materials for that repo, giving you the full dependency graph, not just the primary language.

---

## Step 1: Ingest the data

Fetch `repos.json` from the scraper's GitHub Pages site:

```python
import httpx

REPOS_URL = (
    "https://uk-x-gov-software-community.github.io"
    "/xgov-opensource-repo-scraper/repos.json"
)

def fetch_repos() -> list[dict]:
    response = httpx.get(REPOS_URL, timeout=60)
    response.raise_for_status()
    return response.json()
```

Or in TypeScript:

```typescript
const REPOS_URL =
  "https://uk-x-gov-software-community.github.io/xgov-opensource-repo-scraper/repos.json";

async function fetchRepos(): Promise<Repo[]> {
  const response = await fetch(REPOS_URL);
  return response.json();
}
```

Cache the result locally — there is no point fetching it more than once per session as it only updates overnight.

---

## Step 2: Filter by tech stack

The primary language field lets you narrow down immediately. Because the data does not include topic tags, you have two approaches for more precise filtering: name/description keyword matching, and SBOM dependency analysis for repos that have one.

```python
from datetime import datetime, timezone, timedelta

def filter_by_stack(
    repos: list[dict],
    languages: list[str] | None = None,
    keywords: list[str] | None = None,
    exclude_archived: bool = True,
    exclude_forks: bool = True,
    active_within_days: int = 365,
) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=active_within_days)
    results = []

    for repo in repos:
        if exclude_archived and repo.get("archived"):
            continue
        if exclude_forks and repo.get("isFork"):
            continue

        pushed = datetime.fromisoformat(repo["pushedAt"].replace("Z", "+00:00"))
        if pushed < cutoff:
            continue

        if languages:
            lang = (repo.get("language") or "").lower()
            if lang not in [l.lower() for l in languages]:
                continue

        if keywords:
            haystack = (
                (repo.get("name") or "") + " " +
                (repo.get("description") or "")
            ).lower()
            if not any(kw.lower() in haystack for kw in keywords):
                continue

        results.append(repo)

    return results
```

Example — find actively maintained Python repos related to APIs or data pipelines:

```python
repos = fetch_repos()
filtered = filter_by_stack(
    repos,
    languages=["Python"],
    keywords=["api", "pipeline", "etl", "fastapi", "django", "flask"],
)
```

### Going deeper with SBOMs

For repos that include an `sbom` field, you can fetch the full dependency graph and filter far more precisely — checking whether a repo actually uses FastAPI, Spring Boot, Rails, or any other specific framework:

```python
import gzip, json, httpx

SBOM_BASE = "https://uk-x-gov-software-community.github.io/xgov-opensource-repo-scraper/"

def get_dependencies(repo: dict) -> list[str]:
    """Return a flat list of dependency names from a repo's SPDX SBOM."""
    sbom_path = repo.get("sbom")
    if not sbom_path:
        return []
    response = httpx.get(SBOM_BASE + sbom_path, timeout=30)
    data = json.loads(gzip.decompress(response.content))
    return [
        pkg.get("name", "")
        for pkg in data.get("packages", [])
    ]

def uses_framework(repo: dict, framework: str) -> bool:
    deps = get_dependencies(repo)
    return any(framework.lower() in dep.lower() for dep in deps)
```

This turns a vague "Python repos" search into "Python repos that actually depend on FastAPI" — a much more useful shortlist.

---

## Step 3: Use AI to analyse the filtered repos

Once you have a shortlist, the interesting question is: *what patterns inside those repos are worth borrowing?* This is where AI comes in.

GitHub provides a models API at `https://models.inference.ai.azure.com` that is OpenAI-compatible and works with a standard GitHub personal access token — no separate subscription needed. It is the same endpoint used by GitHub Copilot Extensions.

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://models.inference.ai.azure.com",
    api_key="<your-github-pat>",
)

def analyse_repo(repo: dict, dependencies: list[str] | None = None) -> str:
    deps_line = ""
    if dependencies:
        deps_line = f"- Key dependencies: {', '.join(dependencies[:20])}\n"

    prompt = f"""You are a senior software engineer reviewing a UK government open source repository.
Based on the metadata below, describe in 2-3 sentences what patterns, architectural decisions,
or reusable components this repo likely contains that would help a government team building
similar services. Focus on practical value: testing strategies, CI/CD patterns, accessibility
tooling, security configurations, API design, or infrastructure-as-code.

Repository:
- Name: {repo['owner']}/{repo['name']}
- Description: {repo.get('description') or 'No description'}
- Language: {repo.get('language') or 'Unknown'}
{deps_line}- Stars: {repo.get('stargazersCount', 0)}
- Last pushed: {repo['pushedAt']}
- URL: {repo['url']}
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200,
    )
    return response.choices[0].message.content
```

Passing in the actual dependencies makes the summaries significantly more accurate — the model can identify Spring Boot patterns, pytest fixtures, or Terraform module structures rather than guessing from the repo name alone.

---

## Step 4: Go deeper with code search

For repos that look particularly promising, use the GitHub Search API to look for specific patterns in the source:

```python
def search_patterns_in_repo(
    owner: str,
    name: str,
    pattern: str,
    github_token: str,
) -> list[dict]:
    url = "https://api.github.com/search/code"
    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github+json",
    }
    params = {"q": f"{pattern} repo:{owner}/{name}", "per_page": 5}
    response = httpx.get(url, headers=headers, params=params, timeout=15)
    return response.json().get("items", [])
```

Useful patterns to search for:
- `Dockerfile` — containerisation approaches
- `terraform` or `bicep` — infrastructure-as-code
- `pytest` or `rspec` — testing conventions
- `openapi` or `swagger` — API specifications
- `trivy` or `snyk` — security scanning in CI
- `axe` or `pa11y` — accessibility testing

Pass the resulting file URLs back to the AI for a targeted follow-up summary of exactly those files.

---

## Putting it all together

A minimal end-to-end pipeline:

```python
def explore_government_repos(
    languages: list[str],
    keywords: list[str],
    patterns_to_search: list[str],
    github_token: str,
) -> list[dict]:
    print("Fetching government repository data...")
    repos = fetch_repos()

    print(f"Filtering {len(repos)} repos by stack...")
    shortlist = filter_by_stack(repos, languages=languages, keywords=keywords)
    print(f"Found {len(shortlist)} matching repos.")

    results = []
    for repo in shortlist[:20]:  # cap at 20 to stay within API rate limits
        deps = get_dependencies(repo)
        summary = analyse_repo(repo, dependencies=deps)

        code_hits = []
        for pattern in patterns_to_search:
            hits = search_patterns_in_repo(
                repo["owner"], repo["name"], pattern, github_token
            )
            code_hits.extend(h["html_url"] for h in hits[:2])

        results.append({
            "repo": repo["url"],
            "ai_summary": summary,
            "code_examples": code_hits,
        })

    return results

# Example call
results = explore_government_repos(
    languages=["Python"],
    keywords=["api", "django", "fastapi"],
    patterns_to_search=["pytest", "Dockerfile", "openapi"],
    github_token="ghp_...",
)
```

---

## What this enables for your team

A tool like this would let any government software team answer questions like:

- "Which other teams are building REST APIs in Java and what does their error handling look like?"
- "Are there any government Go services using Terraform modules we could adapt?"
- "Which Python data pipeline repos have a testing approach we could follow?"

The value isn't just finding code to copy — it is knowing a pattern has already been validated in a government service context, with all the constraints (accessibility, security, procurement) that implies.

---

## Next steps

1. **Start small** — build the script above locally and share what you find in the community Slack
2. **Exploit the SBOMs** — the scraper already collects Software Bills of Materials for thousands of repos; richer dependency-based filtering is there to be built
3. **Build a shared tool** — if several teams build this independently it is worth making a hosted version for the whole community

The data is already there. The APIs are free to use. This is a weekend project waiting to happen.

If you build something, share it — open a PR to add it to our [community GitHub](https://github.com/uk-x-gov-software-community) or post about it in the community Slack.
