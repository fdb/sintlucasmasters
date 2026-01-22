# Website Eindprojecten Sint Lucas Antwerpen

## Doelen en scope

- Eén centrale database voor alle studentenprojecten van PREMA_BK, MA_BK, BA_FO, BA_BK (later)
- Zelfservice upload door studenten (vervangt Google Form).
- Workflow voor review, print‑goedkeuring en publicatie.
- Publieke website met archief per jaar en filtering per afstudeerrichting en context.
- Hosting via Cloudflare (Pages + Workers + D1 + Images).

## Publieke website

- Overzichtspagina met alle projecten.
- Detailpagina per project.
- Standaard: “Huidig jaar” pagina met filter per afstudeerrichting en context.
- OF verschillende domeinen, één per afstudeerrichting (sintlucasmasters.com, sintlucasfoto.com, ...)
- Archiefpagina met jaar‑selector en contextfilter.
- Responsieve grid‑layout.
- SEO‑metadata per pagina.
- Styling: minimale CSS met system font stack.

## Studentportaal

- Login via magic link (speciale link via e‑mail, geen paswoorden).
- Dashboard met eigen project(en).
- Project ingeven en bewerken zolang de status niet ready_for_print is.
- Read‑only weergave wanneer project is vergrendeld.

## Admin dashboard

- Login via magic link; admin herkent docenten via interne vlag.
- Admin dashboard met:
  - Filters op status, context en jaar.
  - Status‑badges (draft, submitted, ready_for_print, published).
  - Snelle acties: markeren als ready, publiceren.
- ZIP export van alle beelden van de master (voor postkaarten Chloé)
- Bulk‑actie: “unlock all” (reset huidige jaar naar submitted).

## Authenticatie & beveiliging

- Studenten mogen alleen hun eigen projecten bewerken.
- open vraag: Kunnen studenten hun project nog bewerken nadat ze zijn afgestudeerd (geen gekoppelde KdG email meer)?

## Data‑ en contentmodel

- Project is de centrale entiteit.
- Vraag: zijn "studenten" ook een entiteit? Meerdere projecten gekoppeld aan één student (bv. traject BA_FOTO → PREMA_BK → MA_BK)
- Afstudeerrichtingen: PREMA_BK, MA_BK, BA_FO, BA_BK
- Contexten: Autonomous, Applied, Digital, Socio‑Political, Jewelry.
- Status flow: draft → submitted → ready_for_print → published
- Admin kan “unlock all” uitvoeren om weer te kunnen bewerken.
- Meerdere beelden per project met sortering en caption.
- Project:
  - naam student
  - titel project
  - bio student
  - beschrijving project
  - context
  - academisch jaar
  - hoofdafbeelding
  - andere beelden
  - tags (?)
  - social links

## Media & migratie

- Media via Cloudflare Images.
- Beelden worden automatisch gecheckt op resolutie:
  - Min. resolutie van 3000x3000 (?) voor hoofdafbeelding / postkaart
  - Min. resolutie van 1000x1000 voor andere afbeeldingen
- Import van alle bestaande MA-projecten (±307).

## Testen & kwaliteitsborging

- Unit tests (Vitest) voor auth‑ en tokenlogica.
- E2E tests (Playwright) voor login flow, student edit, admin acties.
- Handmatige tests: e‑maildeliverability, mobiel, cookies.

## Bootstrapping

- CLI‑tool npm run create-admin voor het maken van admin-users en editors.
- Formulier voor het bulk aanmaken van studenten met naam + e-mail adres + afstudeerrichting.

## AI

- AI kan spell-check suggesties doen op de teksten van de projecten
- AI kan helpen bij het genereren van automatische vertalingen

## Openstaande vragen

- Eén website voor alle afstudeerrichtingen of aparte domeinen?
- Website-taal: site in het Nederlands, Engels of tweetalig?
- Content-taal: mogen studenten hun project in het Engels of Nederlands indienen?
- Kunnen studenten hun project volledig verwijderen?
- Kunnen studenten hun projecten aanpassen nadat ze zijn afgestudeerd? (Bv social links aanpassen)
- Wat gebeurt er met projecten na afstuderen (archiefbeleid)?
- Email-notificaties voor workflow? (bv. bij statusverandering)
