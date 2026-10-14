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

## Features

These features should be included, but dont limit yourself to those, the Agent should be creative and include things
that could make sense to have in nEESSI admin client.

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

## Tech Stack

Standard Nav is the goal! 

* Use Aksel!
* look up standard front-end for Nav in 2026
* maybe nextjs?
* maybe react?
* pretty typescript
