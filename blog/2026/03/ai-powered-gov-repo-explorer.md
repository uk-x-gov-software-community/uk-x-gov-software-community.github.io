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

The scraper publishes a JSON file containing an array of repository objects. Each one looks roughly like this:

```json
{
  "name": "govuk-frontend",
  "full_name": "alphagov/govuk-frontend",
  "html_url": "https://github.com/alphagov/govuk-frontend",
  "description": "The GOV.UK Design System Frontend",
  "language": "JavaScript",
  "topics": ["design-system", "frontend", "govuk", "accessibility"],
  "stargazers_count": 1423,
  "forks_count": 312,
  "license": { "spdx_id": "MIT" },
  "pushed_at": "2026-03-20T14:30:00Z",
  "owner": { "login": "alphagov" }
}
```

Every field you need to filter, rank, and compare repositories is already there. There is no API to call or authentication to manage — it is just a JSON file you can fetch with a single HTTP request.

---

## Step 1: Ingest the data

Start by pulling the JSON. In Python:

```python
import httpx

SCRAPER_DATA_URL = (
    "https://uk-x-gov-software-community.github.io"
    "/xgov-opensource-repo-scraper/data.json"
)

def fetch_repos() -> list[dict]:
    response = httpx.get(SCRAPER_DATA_URL, timeout=30)
    response.raise_for_status()
    return response.json()
```

Or in TypeScript:

```typescript
const SCRAPER_DATA_URL =
  "https://uk-x-gov-software-community.github.io/xgov-opensource-repo-scraper/data.json";

async function fetchRepos(): Promise<Repo[]> {
  const response = await fetch(SCRAPER_DATA_URL);
  return response.json();
}
```

Cache the result locally — the file is updated nightly so there is no need to re-fetch it more than once per session.

---

## Step 2: Filter by tech stack

Let users specify which languages and topics they care about, then filter the list down:

```python
def filter_by_stack(
    repos: list[dict],
    languages: list[str] | None = None,
    topics: list[str] | None = None,
    min_activity_days: int = 365,
) -> list[dict]:
    from datetime import datetime, timezone, timedelta

    cutoff = datetime.now(timezone.utc) - timedelta(days=min_activity_days)
    results = []

    for repo in repos:
        # Skip stale repos
        pushed = datetime.fromisoformat(repo["pushed_at"].replace("Z", "+00:00"))
        if pushed < cutoff:
            continue

        # Match language (case-insensitive)
        if languages:
            repo_lang = (repo.get("language") or "").lower()
            if repo_lang not in [l.lower() for l in languages]:
                continue

        # Match topics (any overlap)
        if topics:
            repo_topics = set(repo.get("topics") or [])
            if not repo_topics.intersection(t.lower() for t in topics):
                continue

        results.append(repo)

    return results
```

Example usage — find all actively-maintained Python repos that deal with APIs or data pipelines:

```python
repos = fetch_repos()
filtered = filter_by_stack(
    repos,
    languages=["Python"],
    topics=["api", "data-pipeline", "etl", "fastapi", "django"],
    min_activity_days=365,
)
```

You could extend this with a simple CLI or a small web interface with checkboxes for common stacks (Java / Spring, TypeScript / Node, Python / Django, Ruby / Rails, Go, etc.) so non-technical users can explore it without touching code.

---

## Step 3: Use AI to analyse the filtered repos

Once you have a shortlist of relevant repos, the interesting question is: *what patterns inside those repos are worth borrowing?* This is where AI comes in.

GitHub provides a models API at `https://models.inference.ai.azure.com` that is OpenAI-compatible and works with the standard SDKs. You can access it with a GitHub personal access token — no separate subscription needed. The same endpoint is used by GitHub Copilot Extensions.

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://models.inference.ai.azure.com",
    api_key="<your-github-pat>",
)

def analyse_repo(repo: dict) -> str:
    prompt = f"""
You are a senior software engineer reviewing an open source government repository.
Given the following repository metadata, describe in 2-3 sentences what patterns,
architectural decisions, or reusable components this repository might contain that
would be valuable to a government software team building similar services.
Focus on practical value: testing strategies, CI/CD patterns, accessibility
approaches, security configurations, API design, or infrastructure-as-code.

Repository:
- Name: {repo['full_name']}
- Description: {repo.get('description', 'No description')}
- Language: {repo.get('language', 'Unknown')}
- Topics: {', '.join(repo.get('topics') or [])}
- Stars: {repo.get('stargazers_count', 0)}
- Last pushed: {repo.get('pushed_at', 'Unknown')}
- URL: {repo['html_url']}
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200,
    )
    return response.choices[0].message.content
```

For a shortlist of 20–50 repos you can run this affordably in a batch. The model can identify likely patterns from the repo's name, description, language, and topics without needing to read the full source code.

---

## Step 4: Go deeper with code search

For repos that look particularly promising, go further by using the GitHub Search API to look for specific patterns inside them:

```python
import httpx

def search_patterns_in_repo(
    repo_full_name: str,
    pattern: str,
    github_token: str,
) -> list[dict]:
    """Search for a code pattern within a specific repo."""
    url = "https://api.github.com/search/code"
    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github+json",
    }
    params = {"q": f"{pattern} repo:{repo_full_name}", "per_page": 10}
    response = httpx.get(url, headers=headers, params=params)
    return response.json().get("items", [])
```

For example, you could search for:
- `Dockerfile` patterns to find good containerisation examples
- `terraform` or `bicep` for infrastructure-as-code approaches
- `pytest` or `rspec` for testing conventions
- `openapi` or `swagger` for API specifications
- `DAST` or `SAST` for security tooling in CI pipelines

Then pass those file URLs back to the AI for a more targeted summary.

---

## Putting it all together

A minimal end-to-end flow looks like this:

```python
def explore_government_repos(
    languages: list[str],
    topics: list[str],
    patterns_to_search: list[str],
    github_token: str,
) -> list[dict]:
    print("Fetching government repository data...")
    repos = fetch_repos()

    print(f"Filtering {len(repos)} repos by stack...")
    filtered = filter_by_stack(repos, languages=languages, topics=topics)
    print(f"Found {len(filtered)} matching repos.")

    results = []
    for repo in filtered[:20]:  # Cap at 20 for API rate limits
        summary = analyse_repo(repo)
        code_hits = []
        for pattern in patterns_to_search:
            hits = search_patterns_in_repo(
                repo["full_name"], pattern, github_token
            )
            code_hits.extend(hits[:3])

        results.append({
            "repo": repo["html_url"],
            "ai_summary": summary,
            "code_examples": [h["html_url"] for h in code_hits],
        })

    return results
```

---

## What this enables for your team

A tool like this would let any government software team answer questions like:

- "Which other teams are building REST APIs in Java and what does their error handling look like?"
- "Are there any government Go services with well-structured Terraform modules we could adapt?"
- "Which Python data pipeline repos have good test coverage patterns we could follow?"

The value isn't just in finding code to copy — it is in knowing that a pattern has already been validated in a government service context, with all the constraints (accessibility, security, procurement) that implies.

---

## Next steps

If this idea interests you, here is how to get involved:

1. **Start small** — build a local script using the steps above and share what you find in the community Slack
2. **Contribute to the scraper** — add richer metadata (detected frameworks, CI system, test coverage signals) to make filtering more precise
3. **Build a shared tool** — if several teams find this useful independently, it is worth building a hosted version for the whole community

The data is already there. The APIs are free to use. This is a weekend project waiting to happen.

If you build something, share it — open a PR to add it to our [community GitHub](https://github.com/uk-x-gov-software-community) or post about it in the community Slack.
