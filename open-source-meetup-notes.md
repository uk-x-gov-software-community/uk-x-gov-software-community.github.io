---
layout: layout.njk
title: x-gov Open Source Community Meeting Notes
---
# x-Gov Open Source Community Meeting Notes

## Overview

Notes from the monthly x-Gov open source community meet ups.

To find out details of the meet ups see the [#open-code x-gov slack channel](https://ukgovernmentdigital.slack.com/archives/C0Q3KG7B8).

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

  ![Example of a PlantUML rendered diagram in GitHub](http://www.plantuml.com/plantuml/proxy?cache=no&src=https://raw.githubusercontent.com/nhsx/dt-architecture/main/architects.puml?token=GHSAT0AAAAAACCIMGVSQUQELMVPVUONRIXWZGD4WFQ)

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
- Slides: [open source presentation](/open-source-presentation/)

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




 
 