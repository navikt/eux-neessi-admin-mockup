# Neessi admin prototype

This project is a throwaway prototype to showcase what an admin client of a neessi admin could look like.

This serves as a vision, nothing will be inplemented in teh back-end now, all data is mockups/fake data to
show how amazing it can be in the future. When creating the client it will have good code, but no need to think about
real integrations to fetch data, these is to showcase with fake data. It will be a 100% standalone web-app.

It will follow Aksel design guidelines, but really, just make it pretty. Show what is possible with amazing AIs 
like Claude Opus 5.5.

Pretty and good UX is a requirement!

## About

The neessi admin, also known as EUX-admin, is a admin for administrating settings, default texts,
statistics overviews, database overviews etc. for the EUX/nEESSI domain. It will serve as a companion to
the nEESSI (eux-web-app) application.

## Who should have access

neessi admin users and developers of neessi will have access to the final client. But for this prototype it
should just be "simple" login for all users like it is for the portal in eux-architecture.

The prototype uses a **dummy login**: no real authentication, just a pretty login screen where you pick or type a
name and get in. The logged-in user is shown in the header to make it feel real.

## Domain: EESSI

EESSI (Electronic Exchange of Social Security Information) is the EU system for exchanging social security
information between member states (EU/EEA + Switzerland and the UK). It is the core domain of this admin. Look it up, and
look at `navikt/eux-architecture` (especially `doc/buc_sed_dependencies`) for how we model it.

* **BUC** (Business Use Case): a case between Norway and one or more countries, e.g. `H_BUC_01`, `LA_BUC_02`, `P_BUC_01`
* **SED** (Structured Electronic Document): a document sent within a BUC, e.g. `H001` (Anmodning om informasjon) and
  its reply `H002`
* **Sectors**: AW, FB, H, LA, M, P, S, UB, X (administrative)
* **RINA**: the EU case system we integrate with. **nEESSI** (`eux-web-app`) is NAV's own client
* **Enhet**: the NAV unit that owns and processes a case

Make up realistic cases and people: real SED/BUC types and country codes, plausible NAV enheter, made-up
names and case numbers. Never use real personal data.

### Mock data

All data is fake and lives in a simple mock layer inside the app. Don't overdo it — this is a showcase. It just
needs to look realistic and be consistent across the screens (the numbers on the dashboard should match the statistics).

## Features

These features should be included, but dont limit yourself to those, the Agent should be creative and include things
that could make sense to have in nEESSI admin client.

Navigation, screen structure and the landing page are up to the AI. Be creative.

**Most important — make these shine first:**

1. Default values for texts
2. Statistics
3. Have we answered the other EU countries?

### Have we answered the other EU countries?

A view of incoming SEDs that are waiting for an answer from Norway: per country, per sector and per enhet,
how long they have been waiting, and which ones are overdue.

### Default Texts

Free text fields such as the ones in "Anmodning om informasjon" in H001 should have configurable default texts. 
They can be different depending on "enhet".

### Publiser SED Hendeler

"Ad-hoc" admin tool such as the existing Publiser SED hendelser in eux-web-app should be in the admin client instead.
A easy to udnerstand and exxpandable section for these kind of ad hoc things.

### Statistics

This is a big one! we want amazing views into how many SEDs we send to various countries, who sends back to us, etc.
Give an amazing journey into how Norway is delivering in the EESSI framework. Where do we anwser SEDs, how fast 
do we anwser etc.

### Live view

We want an initial dashboard that gives an insign into how we are doing today, how many SEDs have been sent, how many
BUCs have been created. Are our databases online etc.

### User management

include a user management system, that is a management system for the users of nEESSI. SHould be pretty and easy to use

### Feature adoption

How much are various parts of nEESSI used, this needs to be possible to find somewhere. When creating something new
we want to know if someone is using it.

### Database view

* Which databses do we have?
* Are they in good postgres versions?
* Which databses should we upgrade?
* include statistics for how big our databases are

## Explore this

* navikt/eux-web-app -> this is the neessi client, which this admin companions
* navikt/eux-architecture -> the portal and established fact
* navikt/eux* repos, -> the admin is for EUX as a whole, not just nEESSI.

## Things to consider

* Include many small animations and parallax design
* Uniform and pretty design across the web page
* really dig into my requirements here, and follow them. but you may "merge" them into screens, create them in completely different ways etc. be creative.
* this is a admin client, it will not have huge userbase, but is really important. good UX, pretty UX 
* **Language:** the UI supports Norwegian (bokmål) 
* **Accessibility:** out of scope for this mockup. It takes shortcuts and only needs to look great for normal users.
  Universal design (WCAG) will be handled when we build the real client

## Tech Stack

Standard Nav is the goal! 

* Use Aksel!
* look up standard front-end for Nav in 2026
* maybe nextjs?
* maybe react?
* pretty typescript
* For things Aksel doesn't cover (charts, maps, animations, etc.), the AI picks free, industry-standard libraries
  that look amazing in 2026

## Running and deployment

The app is built on GitHub and runs on **Nais**, the same way as the portal in `navikt/eux-architecture`
(`portal/`):

* **Build:** GitHub Actions (pnpm, Node 22) builds the app, then builds and pushes a Docker image
  (see `.github/workflows/portal-build-deploy.yaml`)
* **Deploy:** the same workflow deploys to Nais in the `eessibasis` namespace, using a `.nais/` config
* **URL:** https://eux-neessi-admin.intern.dev.nav.no/ (app name `eux-neessi-admin`, internal ingress only)
* **Access:** the repo is authorized to deploy to Nais in the `eessibasis` team
* **App:** a Next.js app with a Dockerfile and health/metrics endpoints (`/api/internal/health/live`,
  `/api/internal/health/ready`, `/api/internal/metrics`)
