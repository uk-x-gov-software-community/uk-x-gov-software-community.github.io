---
layout: page.njk
title: Open Source Guide - DRAFT
---

## Overview 

When you bring your service to assessment, in order to move on to the next phase of development, **you must meet the service standard point 12**:

- ***[Make all new source code open](https://www.gov.uk/service-manual/service-standard/point-12-make-new-source-code-open)***

Some service teams have difficulty meeting this requirement, often citing security as an issue. This guide aims to help teams safely and confidently publish their code in the open, and to address concerns of cyber security and privacy.

This guidance should be read in addition to that contained in the [service manual](https://www.gov.uk/service-manual), and does not replace or supersede that guidance, specifically:
- [When code should be open or closed](https://www.gov.uk/government/publications/open-source-guidance/when-code-should-be-open-or-closed)
- [Security considerations when coding in the open](https://www.gov.uk/government/publications/open-source-guidance/security-considerations-when-coding-in-the-open)
- [Making code open and reusuable](https://www.gov.uk/service-manual/technology/making-source-code-open-and-reusable)

## Contents

| Section |
|---------|
| [Why should you open source?](#why-should-you-open-source) |
| [Open sourcing checklist](#open-sourcing-checklist)        |
| [Supply chain management](#supply-chain-management)        |
| [Configuration vs application code](#configuration-vs-application-code) |
| [APIs](#apis)                                                           |
| [Database schema](#database-schema)                                     |
| [Code that writes code](#code-that-writes-code)                         |
| [Off-the-shelf third party code, APIs and proprietary solutions](#off-the-shelf-third-party-code,-APIs-and-proprietary-solutions) |
| [Source control and repositories](#source-control-and-repositories)     |
| [Documentation](#documentation) |
| [See also](#see-also)           |

## Why should you open source?

So why in general is open source any good?

- **Quality through collaboration**, developers can work together with other experts resulting in a higher quality product

- **Security through visibility**, opening up the source code allows developers around the world to find the security flaws and bugs in the code

- **Promotes good practice**, by exposing your code to the scrutiny of others you are encouraged not to take shortcuts and use workarounds, but instead follow best practice and secure by design principles, removing "code smells" like using hard coded secrets and leaving SQL injection vulnerabilities

- **No vendor lock in**, using proprietary software can force businesses to continue relying on a product because they lack the flexibility and freedom to break free

- **Cheaper**, open source doesn’t mean free, often open source products will sell support and training, or hosted solutions, that businesses can buy to ensure the product remains in active development, however these will usually be a lot cheaper than proprietary licenses

- **Continuous improvement mantra**, open source developers often try to create products that are as useful to the community as possible, and are constantly trying to improve the software, proprietary solutions serve the vendor, which may lead to prioritising features for big clients rather than the wider community

- **Critical mass**, open source development benefits from the network effects of the internet meaning it is constantly growing, as more and more companies adopt open source software and open source development practices the default choice is becoming open source

How can going open source help to deliver better public services in government?

- **Our money, our code**, public services are built with public money, the code they’re based should be made available for people to reuse and build on

- **Don't repeat yourself**, open source code can be reused by developers working in government, saving time and resources and reducing duplication of effort

- **Keeping it simple and clear**, publishing code in the open from the start encourages people to create better documentation and to structure the code more clearly, making it easier to maintain in the future

- **Help others to help you**, working in the open invites other developers across Government to make suggestions about how the code can be improved or where security can be improved

## Open sourcing checklist

The following is a minimal list of things you should consider doing before open sourcing your code.


| #  | Measure | Description |  |
|----|-----------------------------------------------------|-------------|--|
| 1. | Keep an up-to-date Software Bill of Materials (SBOM)| helps quickly see if you might be impacted by any recently published vulnerability. The SBOM can be created using an automated tool, for example, [GitHub recently released self-service SBOMs](https://github.blog/2023-03-28-introducing-self-service-sboms/) | |
| 2. | Automated dependency management | use tools such as Dependabot and Snyk to assist in keeping your dependencies up to date and secure | |
| 3. | Robust code repository branching strategy and code quality assurance | Never accept direct commits to the main branch, for example, use pull requests for git, with a second reviewer required to approve changes. | |
| 4. | Automated code quality scanning | Use automated tools to scan code commits for malicious and insecure code. | |
| 5. | 2FA for all devs and devops access to the systems used to build, test and deploy the software | | |
| 6. | Robust unique version numbers for all releases | | |
| 7. | Cryptographically sign all releases | | |

## Supply chain management

> *No-one wants to re-use or look at our code, except hackers who will be interested to see what libraries we are using so they can exploit any new vulnerability, it's not worth the risk*

Service teams often cite the risk of exposing project dependencies in an open source repository as a reason for not publishing code in the open. But this risk can be managed effectively and need not prevent teams opening their code.

So how can we defend against insecure dependencies in open source code?

To help make it easy to include other projects in your code all the main programming languages come with "package management" solutions, for example, Java has Maven, Python has pip and JavaScript has NPM. This makes it easy to update packages when they change, however typically a developer still needs to run the package management program when an update is available.

It is possible to configure dependencies to "use latest version", in which case when the code gets built, typically during an automated build and release pipeline, the package manager will fetch the latest version of any dependency and use that. 

This does pose a risk, as recently there has been some isolated cases of repository "poisoning" attacks to well known open source packages. Typically this is a disgruntled developer purposely pushing malicious code to an open source repository and releasing it. With "use latest" configured, the malicious update gets automatically pulled into a project the next time it is built. 

Therefore it is better to employ some automated tools that help detect these sort of risks and only update packages to known "safe" versions. Github has a "[Dependabot](https://docs.github.com/en/code-security/dependabot)" which can alert a repository owner of dependencies that need to be updated, and tools like "[snyk](https://snyk.io/product/open-source-security-management/)" can find and automatically fix vulnerabilities within dependencies in your code.

Used correctly these tools can mitigate the perceived risk of exposing your dependencies in an open source repository.

Keeping an up-to-date Software Bill of Materials (SBOM) - a list of all the software, third party packages and other dependencies - that your solution uses can help build confidence with security teams. So if and when a zero-day vulnerability is announced in a popular open source package, you can quickly ascertain if you need to take action. Although an SBOM can be maintained manually it is probably best to use an automated tool (for example: [Microsoft recently open sourced their own SBOM tool](https://github.com/microsoft/sbom-tool)).


## Configuration vs application code

> *We can't publish our code as it relates to critical national infrastructure, and by publishing it we might expose private details of those live services*

If you have application code that contains environment or infrastructure specific details, then you have badly written code that is going to become difficult to maintain in the future. So it makes sense to refactor it to remove those specifics, meaning that you can publish it in the open, *and* be confident that it is going to be easier to maintain for future developers. 

Well written code should follow clear separation of concerns:

- application code, should be agnostic to any particular environment
- configuration code, should encapsulate all the environment specific details in a parameterised way
- infrastructure as code (IaC), code that builds infrastructure, for example, [terraform scripts](https://www.terraform.io/)
- IaC template code, generic templated IaC code that can be used to create specific IaC scripts

In general any of these categories of code could safely be made open source and published, subject to certain considerations and qualifications:

| #  | Artefact type      | Notes and exceptions                                |
|----|--------------------|-----------------------------------------------------|
| 1. | Application Code   | algorithms used to detect fraud, unreleased policy  |
| 2. | Configuration Code | no specific environment details or hardcoded values, for example, API secrets |
| 3. | IaC                | no specific infrastructure details or hardcoded values, for example, port numbers or resource names |
| 4. | IaC templates      | no specific infrastructure details or hardcoded values, for example, tenancy details |

Consider using [inversion of control (IoC)](https://www.codeproject.com/articles/182942/the-inversion-of-control-pattern) and [dependency injection (DI)](https://www.codeproject.com/tips/657668/dependency-injection-di) patterns in your application code, as this will make it much easier to write environment agnostic code that consumes environment specifics by injection. Using these patterns will also make your code much easier to test, for example, different environmental conditions can be simulated and injected into the application code during testing. 

One specific example of where publishing IaC may be a security risk, is when operating system environment variables are used as parameters to containerised applications. There have been cases where attackers have targeted the base image for a container in order to exploit vulnerabilities via unset o/s environment variables. It is better therefore to remove the dependency on environment variables and use a secrets store to pass data into your containers, for example, [kubernetes secrets configuration](https://kubernetes.io/docs/concepts/configuration/secret/). 

## APIs

> *Our APIs are just for internal consumption, we don't want to publish the details as this could help an attacker figure out a vulnerability in our application*
  
If you have an internal API that is just consumed by your own client application, then you have failed to separate concerns in your architecture, and probably have a tight coupling between your back-end and front-end components. By following an [API first design pattern](https://swagger.io/resources/articles/adopting-an-api-first-approach/) - basically where you design the API first before the UI or the database - you will force yourself to create more maintainable and less tightly coupled architecture, with the added benefit of creating an API as a product in it's own right. Starting with the API can also lead to a much simpler design, as it forces you to consider what capabilities your system should deliver in a [process driven way, rather than just how to provide data to display on a user interface](https://hackernoon.com/process-driven-rest-api-design-75ca88917582). 

So even if your API is not a *public API* - in the sense that it won't ever be exposed on a public end-point for third party systems to interact with - it is still sensible to document it in an open way. This will help developers in the future, who may have to extend or maintain your API, quickly understand how it works. If you are creating a REST API you should define and describe it using the [Open API Specification (OAS)](https://spec.openapis.org/oas/latest.html), which you can then publish alongside your open source code. In addition to a formal API specification, you should also [produce developer documentation for your API](https://www.gov.uk/guidance/how-to-document-apis) which describes how to use your API, with examples of common use cases and code snippets.

Publishing details about your API should not present a risk, if you have properly considered security from the outset when designing your API. 

The complete list of common security issues to fix in your API can be found in the [OWASP API security project](https://owasp.org/www-project-api-security/). 

The following is a minimal list of some of the most important measures to take before publishing your API:

| #  |  Measure                | Description |
|----|-------------------------|-------------|
| 1. | Avoid anonymous end-points | Typically there will never be a need to expose an API end-point that does not require authentication, with some exceptions, where anonymous access is enabled ensure responses are limited |
| 2. | Use OAuth to secure API end-points | OAuth supports claims based authorisation, making it much easier to control the level of access a consumer has to your API |
| 2a. | Never user Basic authentication | Passwords are sent in plain text in the URL! |
| 2c. | Avoid using API keys | Often these are used for developer access to an API and can be passed in the URL, allowing a consumer full access to all end-points, they should be avoided as they are difficult to update if compromised and easy for an attacker to exploit | 
| 3. | Define resource level access controls | Checking the authorisation for every request to an API enables granular access controls, for example, when using OAuth by defining the scopes (a special type of claim) which will be accepted by each end-point request, in addition this enables your OAS specification to include the authorisation information, making it easier for consumers to use your API securely. |
| 4. | Validate all inputs | Request payloads containing data that is de-serialised should enforce schema validation and reject unknown attributes. All parameters (URL and query string) should be validated and type checked before being processed. Otherwise attackers could exploit lax input validation to craft requests that result in unexpected effects. |
| 5. | Use TLS | All end-points should be encrypted using TLS |
| 6. | Configure CORS | Appropriate Cross Origin Resource Sharing (CORS) headers should be configured for the API, to minimise the risk of cross origin attacks |
| 7. | Turn off unnecessary HTTP verbs | Only allow the verbs your API actually supports on each resource, for example, if users can never be deleted, do not accept `DELETE` on the `users` resource. Also switch off other verbs that are not required, for example, `HEAD`. |
| 8. | Remove any end-points you don't need | Remove stuff that is there for testing, or stubs for future development, only expose the end-points you actually need |
| 9. | Version your API | Follow a robust versioning strategy, for example, URL versioning |
| 10.| Enforce content type | If your API only accepts JSON, enforce this through content type headers and reject other types of request |

Sometimes teams say they cannot open their code as it is calling a *closed API* the details of which they do not want to release publicly. Again this suggests the code consuming the API is not structured appropriately. The calls to the closed API should be encapsulated in a client component with a *clearly defined programming interface*. This client component can be kept private, whilst the programming interface can be made open, and published alongside the code that consumes the API. Thereby keeping the implementation details of the exact request/response structure private whilst allowing the rest of the code to safely be made public. 

## Database schema

In general a system should never allow direct access to its transactional database, preferably access would be via a public API, or through a separate analytical data store (data warehouse, data lake, etc.) But it should still be possible to document and publish the underlying transactional database schema, as this will be valuable for developers who maintain a system in the future, and also for when data needs to be migrated out of the system when it is decommissioned and replaced.

Alongside the database schema there may also be other SQL code (in stored procedures and views), this is no different to any other application code resource so should be published in the open, subject to the constraints given above.

Care should be exercised with any use of dynamic SQL, which could present a SQL injection risk. This code should not be published, and should be completely removed as a priority following security best practice.

## Code that writes code

In a similar vein to dynamic SQL, caution should be exercised when publishing any *code that writes code*, for example:
- dynamic SQL
- [JavaScript eval statements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!)
- runtime .NET T4 templates

If at all possible use of these approaches should be removed and replaced with safer alternatives. If not possible then these should not be published in the open.


## Off-the-shelf third party code, APIs and proprietary solutions

> *We are using a proprietary framework which we adapted for our specific solution, so we cannot publish the code in the open*

Or

> *We used an open source CMS solution as-is, with a few custom templates, so there is no point publishing our code in the open*

In both these cases it still makes sense to publish all *new code in the open*. Even if a framework is proprietary (for example Microsoft PowerApps), other teams in government may be using it and may benefit from the work your team has done, for example, to bring it into line with the government design system. Similarly, for open source solutions and frameworks, if your team has created custom code that builds on top of the "vanilla" versions then this could be useful to other teams. The custom or bespoke code should be created in a way that makes it easy to separate from the framework. There is also value to publishing templates even if they are in proprietary formats as these could still be re-used by other teams.

Examples of code that should be published include:

- Custom UI components built for proprietary frameworks
- Templates written in proprietary formats, for example, [Azure Data Factory pipelines](https://nhsx.github.io/au-data-engineering/adfpipelines.html)
- Workflow templates 

## Source control and repositories

> *We have all our code in a private Azure DevOps Git repo, and it would be too much work to extract the parts we could safely publish and push these into a public GitHub repository, with no net benefit to the user*

By coding in the open *from the start* of your project you should avoid this situation. By making your open source repository your main repository in your release pipeline, you can avoid expensive post-hoc publishing processes, where you have to copy code from your private main repository into an open repository.

If parts of your code base must remain private for specific reasons, then by working in the open from the start this can be done *by exception*, with those parts developed in a private repository and included as a dependency of your open code. 

If you have not started by working in the open, and your main repository is private, then in order to meet the service standard, *you will need to develop a process to publish your code into an open repository, or modify your development processes to use an open repository*. This may seem to be unnecessary work from a user's perspective, but for all the reasons given for why open source development is preferred for government services, this is an overall benefit to delivering a maintainable and long lasting solution.

When making your open source repository your main repository it is vital to ensure you have correctly set up permissions for who can commit changes to the repository. If you are using GitHub apply appropriate [branch protection rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches#about-branch-protection-settings) to your main branch, for example:
- Protect the main branch, turn off direct commits and forced pushes
- Force all changes to be via a pull request
- Ensure that all pull requests must have at least one reviewer 
- Have automated code checks on all commits 

## Documentation

> *All our documentation and architecture descriptions as stored in our Confluence knowledge base*

Working in the open, doesn't just mean publishing your code in the open, it also means being open with documentation that describes and explains your code, your service and the problem you are trying to solve. An open source repository lacking any documentation is useless to a future developer. 

Consider including the following artefacts along with your open source code:

| Artefact      |  Description |
|---------------|--------------|
| `README.md`   | A description of your code, what it is for, what it does, how a developer can build and run it, how a collaborator could contribute to it, who is responsible for it, etc. This file should be at the root of your repository. |
| `License.txt` | The [open source initiative compatible license](https://opensource.org/licenses) you release your code under. This file should be at the root of your repository. |
| Architectural diagrams | High level diagrams the show how your code fits in context, its main components and how they interrelate, for example, the [C4 Model context and container diagrams](https://c4model.com/#CoreDiagrams). |
| Service maps and blueprints | End-to-end service maps can help to describe how the code fits in as part of an entire service |
| Architectural Decision Records (ADR) | A list of the key decisions taken around the architecture, with a rationale explaining them. This can be really helpful to future developers to help them understand why your code works in the way it does. Several [markdown templates](https://github.com/joelparkerhenderson/architecture-decision-record) exist for capturing architectural decisions in a light weight way. | 
| Open API Specifications | All HTTP APIs - whether they are open or internal - should be documented. |
| Database schemas and data dictionaries | Details of the data structures used by the solution should be included. |
| Code comments and API reference information | Adequate code comments are a hotly debated topic among developers, with some preferring to let the code do the talking, however well placed comments that explain intent and the why of the code can be invaluable to future developers. Also many programming languages include special comments for automatically building API reference documentation that can assist developers, particularly when the code is intended to be used as a package.  |

## See also

### General links
- [OSS supply chain security paper from Linux foundation](https://project.linuxfoundation.org/hubfs/Reports/oss_supply_chain_security.pdf?hsLang=en)
- [OSS supply chain failure - the story of left-pad](https://getpocket.com/explore/item/how-one-programmer-broke-the-internet-by-deleting-a-tiny-piece-of-code)
- [Inversion of control design pattern](https://www.codeproject.com/articles/182942/the-inversion-of-control-pattern)
- [Dependency injection design pattern](https://www.codeproject.com/tips/657668/dependency-injection-di)
- [Kubernetes secrets configuration](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Never use JavaScript eval statements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!)
- [GitHub branch protection rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches#about-branch-protection-settings)
- [Open source initiative compatible licenses](https://opensource.org/licenses)
- [C4 Model context and container diagrams](https://c4model.com/#CoreDiagrams)
- [Architectural decision record templates](https://github.com/joelparkerhenderson/architecture-decision-record)
- [xGov open source repo leaderboard](https://uk-x-gov-software-community.github.io/xgov-opensource-repo-scraper/)

### GOV.UK
- [Service Standard point 12: Make all new source code open](https://www.gov.uk/service-manual/service-standard/point-12-make-new-source-code-open)
- [Service manual](https://www.gov.uk/service-manual)
- [When code should be open or closed](https://www.gov.uk/government/publications/open-source-guidance/when-code-should-be-open-or-closed)
- [Security considerations when coding in the open](https://www.gov.uk/government/publications/open-source-guidance/security-considerations-when-coding-in-the-open)
- [Making code open and reusuable](https://www.gov.uk/service-manual/technology/making-source-code-open-and-reusable)
- [Produce developer documentation for your API](https://www.gov.uk/guidance/how-to-document-apis)

### Tools
- [GitHub self-service SBOMs](https://github.blog/2023-03-28-introducing-self-service-sboms/)
- [Microsoft Software Bill of Materials (SBOM) tool](https://github.com/microsoft/sbom-tool)
- [dependabot - GitHub dependency scanning](https://docs.github.com/en/code-security/dependabot)
- [snyk - open source code security tool](https://snyk.io/product/open-source-security-management/)

### APIs
- [API first design pattern](https://swagger.io/resources/articles/adopting-an-api-first-approach/)
- [Process driven APIs](https://hackernoon.com/process-driven-rest-api-design-75ca88917582)
- [Open API Specification](https://spec.openapis.org/oas/latest.html)
- [OWASP API security project](https://owasp.org/www-project-api-security/)

### History of open source
- [History of Open Source](https://en.wikipedia.org/wiki/History_of_free_and_open-source_software)
- [Hello World in every programming language](https://github.com/leachim6/hello-world)
- [History of women in computing](https://www.sciencemuseum.org.uk/objects-and-stories/women-computing)
- [Code listing type in](https://archive.org/details/amstrad-action-101/page/n31/mode/2up)
- [Open Letter to Hobbyist](https://upload.wikimedia.org/wikipedia/commons/f/f9/Bill_Gates_Letter_to_Hobbyists_ocr.pdf)
- [The Cathedral and the Bazaar](http://www.catb.org/~esr/writings/cathedral-bazaar/cathedral-bazaar/index.html)
- [Git as a DAG](https://medium.com/girl-writes-code/git-is-a-directed-acyclic-graph-and-what-the-heck-does-that-mean-b6c8dec65059)







