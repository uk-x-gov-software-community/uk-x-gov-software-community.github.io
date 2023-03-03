---
layout: layout.njk
title: Open Source Guide
---
# x-Gov Open Source Guide

## Overview

**WIP - DRAFT**

Totally unofficial, and un-endorsed, notes around how development teams are meeting [service standard point 12](https://www.gov.uk/service-manual/service-standard/point-12-make-new-source-code-open) x-gov.

## Approaches

### Starting out in the open
- use commit scanning to catch things locally before being pushed into public repos

### Going from closed to open
- Separating out data and info from source code
- Mirroring closed gitlab main repo into github repo
- Binned the history of the repo

## Challenges

- effort needed to put pipelines and process in place to go from private repo to public repo
- a process for when things go wrong
  - revoke and rotate leaked keys immediately
- trade off between time and effort spent on this rather than new features
- if urgent bugs are identified in public code do you have the resource to fix the bugs?
- how to build a community to support and maintain the code?
- no-one has ever PR'd into our repo

## Tools

- TBD!

## Reasons
- promote best practice as there is no where to hide
- less likely to take shortcuts as the code is there for everyone to see
- knowledge transfer: teams and people change

## Notes


## See Also

- [X-UK-Gov Public Repository Leaderboard](https://uk-x-gov-software-community.github.io/xgov-opensource-repo-scraper/)
- [#open-code x-gov slack channel](https://ukgovernmentdigital.slack.com/archives/C0Q3KG7B8)