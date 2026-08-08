---
layout: page.njk
title: x-gov Open Source Community Meeting Notes
---

## Overview

Notes from the monthly x-Gov open source community meet ups.

To find out details of the meet ups see the [#open-code x-gov slack channel](https://ukgovernmentdigital.slack.com/archives/C0Q3KG7B8).

## 08 Dec 2023

Attendees:
- AS (CDDO)
- DO (ONS)

Notes:
- Discussed perceived security risks of releasing Infrastructure-as-Code (IaC)
- Felt these were often over stated by cyber teams
- AS (CDDO) talked about draft guidelines drawn up whilst at DHSC / NHS-TD to address service teams concerns over meeting point 12 of the service standard
  - See: [DRAFT open source guidelines](/special-interest/open-source/open-source-guide)

- Heightened level of cyber threats from foreign states
- Supply chain attacks
- Addressed by the use of Snyk and depandabot
- No first hand experience of how good Snyk actually is

- Similar to Top 75 services could identify Top 100 public gov repos
- Question around linking live services with repo
- Could something like security.txt work, e.g. gov.txt, with details of a live services open code repositories?

## 10 Nov 2023

No notes this time, AS (CDDO) did not attend.

## 13 Oct 2023

Again no specific agenda but a general discussion about scanning open repositories for vulnerabilities and introducing pre-commit checks to the developer workflow.

Attendees:
- AS (CDDO)
- Jim (GCHQ)
- RS (NHS)
- ME (Gov Scot)
- CS (CDDO)
- PC (NCSC)
- SS (CDDO)
- BA (DFE)
- MO (CPS)
- CP (DCMS)

Jim GCHQ
- github.com/mi6
- Intelligence Community Design System
- Is this worth having given gov uk design system?

CS
- As an internal design system is worth having as often don't want to follow the one thing per page restriction

RS (NHS)
- There is a common framework in different gov depts 

Jim GCHQ
- Concourse Tools resource creator in python
- nix bootstrap project written in pascal

ME (Gov Scot)
- Contributor license agreement - interesting to see

Jim GCHQ
- We have this set up for all repositories 

SS CDDO
- One nix officianado in GDS 

AS CDDO
- What is concourse?

SS
- Like jenkins, for pipelines, it is a thing doer, without a fancy UI

ME
- Moved to github for source of truth and used git actions for building the npm packages

RS
- Who watches what is going into you repository from contributors?
- We noticed on one open source repository a lot of strange npm packages being added and then we had to...

ME
- Not like you need to change packages on design system so not really an issue

AS
- Can you have rules to flag up things like changes to packages in PRs?

ME
- Not AFAIK

SS
- Github enterprise has some advanced security features but not sure what they are

ME
- It seems like for a public repo you get the full github security features but you don't get the organisational view

SS
- Interesting question who has an enterprise github license

CS 
- You can get an org level view but it's all a bit disjointed

PC
- If you use multiple platforms and vendors your need to be careful not to get multiple alerts for the same thing which can overwhelm your developers

Jim
- A lot of these vulnerability tools are just scanning a database somewhere for a version or vulnerability rather than actual detecting anything bad themselves

SS
- We had admin front end on govuk paas and half of the work of the developers was merging the automerges because we were very paranoid

Jim 
- We have security dashboards but they are not necessarily being looked at very often

CS
- In theory this is feeding into your sophisticated SOC

BA (DFE)
MO (CPS) joined

PC
- Will put it through the github pipeline and will scan for issues then and alert the actual team the made the thing as it's their responsibility to maintain the security

SS
- Is anyone using pre-commit hooks that are more sophisticated than linting?

CS
- Pre-commit hooks are annoying you have to set them up on your machine, git guardian is quite good to stop you accidentally committing secrets and has better entropy scanning than github's own secret scanner

- If you are signing code it takes longer generally than any pre-commit hook would

PC
- Usually don't use pre-commit hook as it is up to the developer to do this so not really a security control

ME
- We had experience when pre-commit would stop the commit and the developer would receive no feedback that the commit had failed

CS
- Implicit supply chain issues with pre-commits that involve running a binary on a machine

Jim
- Had pushback from teams about using stuff like dependabot that means they will get a lot of false positives of a dependency of a dependency when our code doesn't use any of that 

CS
- Core K8S had a massive vulnerabilities but was such a strange config that it was unlikely to ever be a risk, snyk had a way of reporting this, so you can only fix the things that really need fixing

ME
- How does snyk know what it is your production code is using?
  
CS
- Suspect it is static parsing of the code paths 

Jim
- The scoring thing is interesting, remembering the article the developer for Curl wrote about them making up the CVE rankings

RS
- Read similar thing that the CVE for curl was serious but not really that likely

AS
- Seems like the likelihood rating is wrong for these CVEs if the likelihood of being in that config / baseline is low initially shouldn't be critical

CS
- Someone called chain guard has analysed what is wrong with CVE ratings

SS
- Interested in the new snyk feature feels like it is LLM driven

CP (DCMS)
- We could get them to demo that feature to this group?

Huddle chat notes:

Jim GCHQ
- https://design.sis.gov.uk/
- > Intelligence Community Design System - Intelligence Community Design System
Use the UK Intelligence Community's Design System to create accessible, usable, and consistent capabilities for complex and specialised needs (2 MB)

CS CDDO
- I just left CPS, I got code of conducts automatically added to repos eg https://github.com/CPS-Innovation/Polaris/blob/main/CODE_OF_CONDUCT.md

PC NCSC
- Yup, it does things - repos are optional
- GitHub actions checks on PRs are always a good first pass

CS CDDO
- https://david-gilbertson.medium.com/im-harvesting-credit-card-numbers-and-passwords-from-your-site-here-s-how-9a8cb347c5b5
- > I’m harvesting credit card numbers and passwords from your site. Here’s how.
The following is a true story. Or maybe it’s just based on a true story. Perhaps it’s not true at all.
Reading time
10 min read
22 May 2019
- pretty good example of that sort of thing ^

Jim GCHQ
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- > About code owners - GitHub Docs
You can use a CODEOWNERS file to define individuals or teams that are responsible for code in a repository. (7 kB)
- Work in progress - we've been ok with the Free Team plan so far as we've only used it for Open Source where you get most of the features for free

PC NCSC
- Precommit: go linting
- PR workflows: gosec etc

CS CDDO
- https://pre-commit.com/
- From memory AWS Inspector is powered by Snyk as well

Jim GCHQ
- https://daniel.haxx.se/blog/2023/03/06/nvd-makes-up-vulnerability-severity-levels/

CS CDDO
- https://www.linkedin.com/in/danlorenc/ posts are really interesting and relevant on the point
- https://snyk.io/product/snyk-code/
- > Code Security & Code Quality Scanning | Snyk
Learn more about Snyk Code that uses AI for code security testing and provides actionable suggestions right when the code is written.
- see the “Prioritize top code risks” bit

AS CDDO
- Just as an idea for the next meet-up we could try a more structured lean coffee format, if people would find that useful? https://easyretro.io/publicboard/2qsREoUcr2Trw8OrxOwLEW6XdOJ3/2776df3f-7a8d-4b58-b5a2-e75047bdefd4

## 15 Sep 2023

Only a small group this week has a general conversation about open source.

SF (CDDO) - Head of DevOps Modernising Tech
  - How do we bake open source into everything we do
  - How do we take something from private to public
  - SALSA
  - Also US have just done something around SBOMs
  
RS - NHS Tech Lead (previously iPlayer)
  - Couldn't open source everything due licensing issues

SF
  - DSIT is going to release a big report about open source
  - But it isn't bold enough

RS 
  - Do we have an open source governance process?

SF
  - Not that I know of

AS (CDDO formerly NHSX) 
  - From NHS perspective NHS BSA and NHSD have their own published processes and governance around doing open source
  - But nothing central, hence why this forum was initiated by J from GCHQ

SF
  - Can save a lot of money by adopting open source solutions
  - Also there is a procurement mechanism thing about people getting 3rd parties to manage the open source aspects of their services
  - Lawyers and licensing - dread these discussions

RS
  - If you are building open source on top of open-source there is value in that

SF
  - Next week there is 2 day conference called DevOps day london
  - SS (CDDO) and me are trying to set-up a devops community
  - We are asking for funding for this
  - We need money to get a venue 
  - Initial focus on CO staff
  - Thereafter generic devops cloud-ops

RS
  - We do meet ups with Azure and GCP in our area (Leeds)

SF
  - Went to thing the other day about MS copilot
  - Would be useful for other people to come to

AS
  - Spoke to MLOps supplier who may be able to present at that community

SF
  - share great code from parts of gov to other parts of gov
  - How does my team get that code visible to other parts of gov?

RS
  - is that public public or shared between depts?

SF
  - initially share it between depts
  - and then fully public 

AS
  - this is built into the service standards to enforce open source before beta
  - try to apply this to internal facing services
  - requires culture shift

SF
  - 65,000 gov repos in github
  - but 45,000 are not open source
  - how do we make it all open source?
  - first step is make it visible to other gov depts

RS
  - Who keeps these things up to date
  - Some projects use tools that are no longer being managed
  - Different languages, how do you manage libraries that provide a specific API but they are Node and you're in Java?

SF
  - US gov have a format for a maintainer file that can describe if a repo is actively maintained
  - Lot of barriers to doing simple things like raising a PR
  - Hopeful that we can do it

RS
  - How?
  - How do you make your software findable and reusable?

AS
  - This has some similarity to Data Marketplace
  - Facilitating data sharing x-gov

SF
  - How do you find things?
  - We (CDDO) would love to do something like code.gov.uk 
  - US have set up this site: https://code.gov/agency-compliance/compliance/dashboard/


## 21 Jul 2023

No specific agenda items this week so had another general discussion on topics raised by the group.

- Friction to adopting open source solutions
  - Supplier felt it was better to build your own, as easier to maintain
  - Could use well known tech like Python, REST APIs, standard databases rather than a open source product with a small pool of developers and active community
  - Specific example: data catalogue https://github.com/ckan/ckan
  - UK HO seem to have used this: https://github.com/UKHomeOffice/data-catalogue
  - It powers catalog.data.gov, open.canada.ca/data, data.humdata.org among many other sites. Use across other governments so is probably a good sign.
  - Also has 3.9K Stars, 1.9K Forks, 301 contributors, recent last commit / historic activity, uses well known programming language: Python
  - Remember the motivation of the supplier who may want to build their own as they can charge more and also develop their own skills
  - Same argument can be applied against commercial closed source solutions, as these may seem a better choice due to be supported and paid for with agreed SLAs for fixing issues
  - Recommendation around data catalogues and data mesh architectures: [AWS re:Invent 2022 - Building data mesh architectures on AWS (ANT336) - YouTube](https://www.youtube.com/watch?v=nGRvlobeM_U) - Data-first organizations are increasingly curious about data mesh architectures. In this session, learn how to design, build, and operationalize a data mesh ...
  
- Concerns when open source product goes commercial and becomes closed source
  - For example: camunda open source workflow engine, from v8 is now closed source
  - Depends on how permissive the original license was
  - Depends on the size of the community
  - Gov has not got resource to take on the support of unadopted or dormant open source solutions
  - Elastic / open search good example of an open source solution going commercial and then being forked by the community and development carrying on

- Use of GitHub for documentation and diagrams-as-code
  - [Example of following a private/public repo approach](https://github.com/co-cddo/data-architecture/tree/main#publish-to-public-repository), with github action that pushes files to the public repo based on a file extension and naming convention
  - Specifically all PlantUML files `.puml` are automatically published along with other files ending in `-p.*`
  - Bit of a hacky approach, using GitHub like a CMS
  - Could there be something similar / more built-in using github pages?
  - Could you extract -> put in git -> have a release pipeline to zip it up and attach to a release for people to consume?
  - Two diagrams-as-code tools:
    - [Mermaid](https://mermaid.js.org/)
    - [PlantUML](https://crashedmind.github.io/PlantUMLHitchhikersGuide/)
  - Mermaid is natively supported by GitHub markdown:

  ```mermaid
  classDiagram
    Doodad <|-- Thingamy
    Doodad <|-- Wotsit
    Doodad <|-- Bananas
    Doodad : +int id
    Doodad: +isUseful()
    Doodad: +twiddle()
    class Thingamy{
      +String colour
      +untwirl()
    }
    class Wotsit{
      -int size
      -canTwirl()
    }
    class Bananas{
      +bool defunct
      +unfold()
    }
  ```
  - PlantUML must be pre-rendered using a GitHub action or the URL of a public raw PlantUML resource can be sent via a public PlantUML server to render the image through an image URL in markdown, for example:

  ![Example of a PlantUML rendered diagram in GitHub](http://www.plantuml.com/plantuml/proxy?cache=no&src=https://raw.githubusercontent.com/nhsx/dt-architecture/main/architects.puml?token=GHSAT0AAAAAACG43ULGXIUWHLCKIJW7H3YAZIVVD5A)

  - Keep our docs in our environment and publish them using GitHub pages. 
  - We have some very limited use of mermaid diagrams. Usually use draw.io for those sorts of diagrams.
  - We don't have anything on GitHub which is written outside the development team as that tends to be internal. 
  - For example: [Documentation for Gaffer](https://github.com/gchq/gaffer-doc)

## 23 Jun 2023

No agenda items this week so had a general discussion on topics brought up by the group

- Update on service manual
  - small team in CDDO looking at putting together a backlog for updates to the service manual 
  - service assessment team in CDDO are doing work around updating training for assessors
    - Looking at training courses for x-gov service assessors 
    - Training for internal departmental assessors too
    - One member of team looking at all the training provided for assessors and refreshing that
  
- Reusable components
  - DWP, building strategic reference architecture
  - Creating components that can be reused across services
  - These are not currently open source
  - Some improvements around point 12 in the service standard could make it more explicit that open sourcing reusable components is preferred
    - An enhanced point 12 should stress that open sourced things should somehow be curated such to be reusable, but doing this well would be a considerable overhead on service teams
  - Can be resistance from leadership at high level to open sourcing 
    - Generally developers who are building the components are all pro open sourcing
    - This results in teams open sourcing less reusable parts of their code base at Beta to get through assessment rather than just reusing already open sourced components
    - CDDO could take this to CDO council and lobby at a senior level "for buy once use many" to include code reuse and architecture patterns 

- Blockers to open sourcing
  - DVSA previously quite risk averse to open source due to concerns over fraud
  - Have now open sourced some smaller components 
  - Infrastructure as code (IaC) not open source and no plans to make it
    - Apps are generally open sourced at ONS, but the IaC isn't,  This could make it tricky for people to consume what is open-sourced due to not having the infrastructure.  Again, confusion/misconceptions of open IaC being too risky.
  - By not putting a whole service open source but just the reusable parts could reduce the perceived risk of fraud
  - We have increased security risks in the new geo-political reality
    - Other countries are open sourcing nothing about their gov projects
  - But what about gen AI and github co-pilot how will this affect the risk appetite?

- Measuring the value of open source
  - How many people are using the code?
  - Sometimes people can look at code without actively reusing it and take inspiration from it
  - No point just putting stuff on GitHub with no explanation or understanding or how to consume it
  - Huge promise on return from investment, but must put in the effort
  - ONS do see open sourcing as beneficial from a recruitment perspective as well, but this is really hard to quantify though
  - [The Prisoner’s Dilemma](https://www.youtube.com/watch?v=7Cqv_gdTkg4), a classic philosophical problem. Basically sharing and co-operation have real benefits, but selfish behaviours produce poor outcomes. 
    - This also relate to the [Public Goods Game/Nash Equilibrium theory](https://www.youtube.com/watch?v=ZVqDsJP5FIc)

- Inner source
  - Maybe the answer is inner-sourcing, using all the approaches of open source in a restricted setting?
  - What about shared GitHub org x-gov for private repositories where code  can be shared x-gov but not publicly
    - But what is the risk with making it public? Would the risk be limited by opening it only to huge range of unknown civil servants and contractors within the civil service? 
    - Something like this was tried in 2012 and turned off in 2015 because no one used it
    - Current thinking is to use a federated model to enable things to be more easily found x-gov, like the x-gov data marketplace
    - Are we saying that being able to share just with x-gov users would not be useful rather than to the whole public?
      - The problem is find-ability not who can find it
      - Could open source gov projects include a x-gov GitHub repo label, as this could make it easier to find stuff?
  
- Usage of paid GitHub enterprise instances
  - [DVSA](https://github.com/dvsa)
  - CO
  - ONS
  - DfT
  
## 19 May 2023

### Code reuse - Open/Inner Source Presentation

- Presenter: [Soydaner](https://github.com/soydaner)
- Slides: [open source presentation](/special-interest/open-source/open-source-presentation/)

## 12 Apr 2023

### Case study
- Presentation around GCHQ's open source approach
- 1st project went out 7/8 years ago
- trying to follow TCoP and get more eyes on the development that we do
- we want to demonstrate to our people that we can work out of the shadows
- currently quite an involved process to get an organisational GitHub account
- before releasing code open source we have to speak to patent teams, in case there is valuable IP
- also the press office need briefing in case the public raise questions
- we follow a checklist for all new projects similar to the NHS one
  - PII / classification scrub
  - Static Analysis and Vulnerability dependency check (& future plan)
  - Independent review
- GCHQ does not take part in the GDS / CDDO service assessment, but have internal assessment processes
- Have built an internal portal where people can see issues with projects and pick them up and work on them
- Are working to automate the sign-up process for the GCHQ org on GitHub
 
### Changing culture for inner source
- sharing code inside of a dept.
- building confidence on allowing other teams to work on each other's code so avoiding to have to raise tickets on backlogs that never get looked at
- requires confidence in your automation

### Tooling
- tooling for API catalogues [Kong](https://konghq.com/)
- [Backstage](https://backstage.io/) framework for building service catalogues

### Challenges
- Forcing everything to be open is too restrictive
  - As required by the [Service Manual - GOV.UK (www.gov.uk)](https://www.gov.uk/service-manual)
  - we should have a more orderly process to decide what to make open
  - "everything is open" is not very constructive
- Working with GitLab vs GitHub, how can you pull things in?
- Open source review panel: How do you scale this sort of process up?
 
### Next Meeting
- Try to get someone from CDDO to talk about the open source point of the service standard
- Conversations around inner source
- Call for case studies on how other teams are doing open source in their depts.

## 03 Mar 2023

Inaugural meeting of the x-gov open source community.

Meeting notes:

### Starting out in the open
- use commit scanning to catch things locally before being pushed into public repos

### Going from closed to open
- Separate out data and info from source code
- Mirroring closed GitLab main repo into a public GitHub repo
  - Binned the history of the repo

### Challenges

- effort needed to put pipelines and process in place to go from private repo to public repo
- a process for when things go wrong, for example:
  - revoke and rotate leaked keys immediately
- trade off between time and effort spent on this rather than new features
- if urgent bugs are identified in public code do you have the resource to fix the bugs?
- how to build a community to support and maintain the code?
- no-one has ever PR'd into our repo

### Reasons to do open source
- promote best practice as there is nowhere to hide
- less likely to take shortcuts as the code is there for everyone to see
- knowledge transfer: teams and people change




 
 