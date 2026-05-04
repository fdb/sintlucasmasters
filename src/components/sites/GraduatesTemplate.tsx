// Graduates site (sintlucasgraduates.com) — header, footer, and About body.
// Edit this file to change the chrome on the umbrella graduates domain.
//
// Unlike the masters and fotografie sites, this header renders programme
// "filter chips" sourced from SiteConfig.nav. To add a new filter (e.g.
// bachelors when they go live), append an entry to graduates.nav in
// src/sites.ts — no edits to this template needed.
//
// The 2025–2026 year is hard-coded (see MastersTemplate for rationale).

import type { FC } from "hono/jsx";
import type { PublicLocale } from "../../lib/i18n";
import { CURRENT_YEAR } from "../../config";
import { type SiteConfig, programmeToSlug } from "../../sites";
import { SearchBox } from "./_shared";

const SCHOOL_URL = "https://www.sintlucasantwerpen.be/";
// TODO(comms): the school site only publishes a Dutch calendar page for this
// event right now; comms is checking whether an EN counterpart can be added.
// Until then both locales link to the Dutch event page.
const EVENT_URL = "https://www.sintlucasantwerpen.be/kalender/graduation-tour-master-premaster-beeldende-kunsten/";
const MASTERS_PROGRAMME_URL_EN =
  "https://www.sintlucasantwerpen.be/en/get-to-know-our-study-programmes/master-of-visual-arts/";
const MASTERS_PROGRAMME_URL_NL = "https://www.sintlucasantwerpen.be/opleidingen/master/";
const PHOTOGRAPHY_PROGRAMME_URL_EN =
  "https://www.sintlucasantwerpen.be/en/get-to-know-our-study-programmes/photography/";
const PHOTOGRAPHY_PROGRAMME_URL_NL = "https://www.sintlucasantwerpen.be/opleidingen/fotografie/";
const MASTERS_APPLY_URL_EN = "https://www.kdg.be/en/programmes/apply-english-taught-master-programme";
const MASTERS_APPLY_URL_NL = "https://www.kdg.be/inschrijven/inschrijven-voor-de-master-beeldende-kunsten";
const PHOTOGRAPHY_APPLY_URL = "https://www.kdg.be/inschrijven/nederlandstalige-professionele-bachelor";

const COPY = {
  en: {
    title: "Graduation Tour",
    navAll: "all",
    navArchive: "archive",
    navAbout: "about",
    footerProgramme: "Sint Lucas Antwerpen",
    footerSub: "School of Arts in the heart of Antwerp.",
    footerLinkOne: "Explore our programmes",
    footerNote: "Sint Lucas Antwerpen, School of Arts, is part of KdG University of Applied Sciences and Arts.",
    footerLinkTwo: "Apply now - admission requirements & application",
    footerPrivacy: "Terms of Use & Privacy",
    programmesUrl: "https://www.sintlucasantwerpen.be/en/get-to-know-our-study-programmes/",
    applyUrl: "https://www.kdg.be/en/programmes",
  },
  nl: {
    title: "Graduation Tour",
    navAll: "alle",
    navArchive: "archief",
    navAbout: "over",
    footerProgramme: "Sint Lucas Antwerpen",
    footerSub: "School of Arts in het hart van Antwerpen.",
    footerLinkOne: "Ontdek onze opleidingen",
    footerNote: "Sint Lucas Antwerpen, School of Arts, maakt deel uit van KdG Hogeschool.",
    footerLinkTwo: "Schrijf je in - toelatingsvoorwaarden en aanvraag",
    footerPrivacy: "Gebruiksvoorwaarden & privacy",
    programmesUrl: "https://www.sintlucasantwerpen.be/opleidingen/",
    applyUrl: "https://www.kdg.be/opleidingen",
  },
} as const;

const Tagline: FC<{ locale: PublicLocale }> = ({ locale }) => {
  if (locale === "nl") {
    return (
      <>
        Ontdek de nieuwe generatie kunstenaars, ontwerpers en fotografen van{" "}
        <a href={SCHOOL_URL} target="_blank" rel="noopener noreferrer">
          Sint Lucas Antwerpen
        </a>
        . Bezoek van 17 t.e.m. 21 juni tijdens{" "}
        <a href={EVENT_URL} target="_blank" rel="noopener noreferrer">
          GRADUATION TOUR 2026
        </a>
        .
      </>
    );
  }
  return (
    <>
      Discover the new generation of artists, designers and photographers from{" "}
      <a href={SCHOOL_URL} target="_blank" rel="noopener noreferrer">
        Sint Lucas Antwerpen
      </a>
      . Visit from 17 to 21 June during{" "}
      <a href={EVENT_URL} target="_blank" rel="noopener noreferrer">
        GRADUATION TOUR 2026
      </a>
      .
    </>
  );
};

type HeaderProps = {
  locale: PublicLocale;
  currentPath: string;
  site: SiteConfig;
  hideSubheader?: boolean;
};

export const GraduatesHeader: FC<HeaderProps> = ({ locale, currentPath, site, hideSubheader }) => {
  const copy = COPY[locale];
  // currentPath without query, lowercased — used to flag which programme chip is active.
  const pathOnly = currentPath.split("?")[0];
  return (
    <>
      <header class="site-header site-header--public">
        <div class="header-inner">
          <a href={`/${locale}/`} class="site-title-link">
            <h1 class="site-title">{copy.title}</h1>
          </a>
          <p class="site-tagline">
            <Tagline locale={locale} />
          </p>
        </div>
      </header>
      {!hideSubheader && (
        <nav class="sub-header">
          <div class="sub-header-inner">
            <div class="sub-header-left">
              <a href={`/${locale}/`} class={pathOnly === `/${locale}/` || pathOnly === `/${locale}` ? "active" : ""}>
                {copy.navAll}
              </a>
              {(site.nav ?? []).map((link) => {
                const slug = programmeToSlug(link.programme);
                const href = `/${locale}/${CURRENT_YEAR}/${slug}/`;
                const isActive = pathOnly.includes(`/${slug}/`) || pathOnly.endsWith(`/${slug}`);
                return (
                  <a href={href} class={isActive ? "active" : ""}>
                    {link.label[locale]}
                  </a>
                );
              })}
              <a href={`/${locale}/archive`}>{copy.navArchive}</a>
              <a href={`/${locale}/about`}>{copy.navAbout}</a>
            </div>
            <div class="sub-header-right">
              <SearchBox locale={locale} />
            </div>
          </div>
        </nav>
      )}
    </>
  );
};

export const GraduatesFooter: FC<{ locale: PublicLocale }> = ({ locale }) => {
  const copy = COPY[locale];
  return (
    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-col footer-col--programme">
            <h3 class="footer-heading">{copy.footerProgramme}</h3>
            <p class="footer-sub">{copy.footerSub}</p>
            <a href={copy.programmesUrl} class="footer-arrow-link" target="_blank" rel="noopener noreferrer">
              {copy.footerLinkOne}
            </a>
            <p class="footer-note">{copy.footerNote}</p>
            <a href={copy.applyUrl} class="footer-arrow-link" target="_blank" rel="noopener noreferrer">
              {copy.footerLinkTwo}
            </a>
          </div>
          <div class="footer-col footer-col--contact">
            <p class="footer-contact-name">Sint Lucas Antwerpen</p>
            <p>Van Schoonbekestraat 143, 2018 Antwerp, Belgium</p>
            <p>
              +32 (0)3 613 12 00 · <a href="mailto:info.sla@kdg.be">info.sla@kdg.be</a>
            </p>
            <p>
              <a href="https://www.sintlucasantwerpen.be" target="_blank" rel="noopener noreferrer">
                sintlucasantwerpen.be
              </a>
              {" · "}
              <a href="https://www.instagram.com/sintlucasantwerpen" target="_blank" rel="noopener noreferrer">
                @sintlucasantwerpen
              </a>
            </p>
          </div>
        </div>
        <div class="footer-bottom">
          <p>
            © Sint Lucas Antwerpen ·{" "}
            <a href="https://www.kdg.be/en/terms-use-privacy" target="_blank" rel="noopener noreferrer">
              {copy.footerPrivacy}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

const ABOUT_COPY = {
  en: {
    interestedHeading: "Interested in our programmes?",
    mastersProgrammeLabel: "Discover the Master of Visual Arts",
    photographyProgrammeLabel: "Discover the Bachelor Photography",
    websiteLinkLabel: "Website",
    mastersApplyLabel: "Apply – admission requirements, tuition fees and application",
    photographyApplyLabel: "Apply – admission requirements, tuition fees and application (in Dutch)",
    creditsHeading: "Credits",
    headMasterRole: "Head of the Master",
    headPhotographyRole: "Head of the Bachelor Photography",
    communicationRole: "Communication",
    developmentRole: "Development",
    designRole: "Design",
    codeNote: "The code for this website is free software, available on GitHub.",
  },
  nl: {
    interestedHeading: "Interesse in onze opleidingen?",
    mastersProgrammeLabel: "Ontdek de Master in de Beeldende Kunsten",
    photographyProgrammeLabel: "Ontdek de Bachelor Fotografie",
    websiteLinkLabel: "Website",
    mastersApplyLabel: "Schrijf je in - toelatingsvoorwaarden, studiegeld en aanvraag",
    photographyApplyLabel: "Schrijf je in - toelatingsvoorwaarden, studiegeld en aanvraag",
    creditsHeading: "Credits",
    headMasterRole: "Hoofd van de master",
    headPhotographyRole: "Hoofd van de Bachelor Fotografie",
    communicationRole: "Communicatie",
    developmentRole: "Ontwikkeling",
    designRole: "Vormgeving",
    codeNote: "De code van deze website is vrije software en beschikbaar op GitHub.",
  },
} as const;

export const GraduatesAboutBody: FC<{ locale: PublicLocale }> = ({ locale }) => {
  const copy = ABOUT_COPY[locale];
  const mastersProgrammeUrl = locale === "nl" ? MASTERS_PROGRAMME_URL_NL : MASTERS_PROGRAMME_URL_EN;
  const photographyProgrammeUrl = locale === "nl" ? PHOTOGRAPHY_PROGRAMME_URL_NL : PHOTOGRAPHY_PROGRAMME_URL_EN;
  const mastersApplyUrl = locale === "nl" ? MASTERS_APPLY_URL_NL : MASTERS_APPLY_URL_EN;
  return (
    <div class="about-content">
      <p class="about-text">
        {locale === "nl" ? (
          <>
            Deze website bevat de afstudeerwerken van de afstuderende Masters Beeldende Kunsten en Bachelors Fotografie
            2025–2026. Naast dit online platform zijn de werken ook fysiek te bezichtigen van 17 t.e.m. 21 juni tijdens{" "}
            <a href={EVENT_URL} target="_blank" rel="noopener noreferrer">
              GRADUATION TOUR 2026
            </a>
            .
          </>
        ) : (
          <>
            This website presents the graduation projects of the graduating Master of Visual Arts and Bachelor
            Photography students 2025–2026. In addition to this online platform, the works can also be viewed physically
            from 17 to 21 June during{" "}
            <a href={EVENT_URL} target="_blank" rel="noopener noreferrer">
              GRADUATION TOUR 2026
            </a>
            .
          </>
        )}
      </p>
      <h3>{copy.interestedHeading}</h3>
      <div class="programme-block">
        <p class="programme-block-label">
          <strong>{copy.mastersProgrammeLabel}</strong>
        </p>
        <p class="programme-links">
          <a href={mastersProgrammeUrl} target="_blank" rel="noopener noreferrer">
            {copy.websiteLinkLabel}
          </a>
          {" · "}
          <a href={mastersApplyUrl} target="_blank" rel="noopener noreferrer">
            {copy.mastersApplyLabel}
          </a>
        </p>
      </div>
      <div class="programme-block">
        <p class="programme-block-label">
          <strong>{copy.photographyProgrammeLabel}</strong>
        </p>
        <p class="programme-links">
          <a href={photographyProgrammeUrl} target="_blank" rel="noopener noreferrer">
            {copy.websiteLinkLabel}
          </a>
          {" · "}
          <a href={PHOTOGRAPHY_APPLY_URL} target="_blank" rel="noopener noreferrer">
            {copy.photographyApplyLabel}
          </a>
        </p>
      </div>
      <h3>{copy.creditsHeading}</h3>
      <dl class="credits-list">
        <div class="credits-entry">
          <dt>{copy.headMasterRole}</dt>
          <dd>Reg Herygers</dd>
        </div>
        <div class="credits-entry">
          <dt>{copy.headPhotographyRole}</dt>
          <dd>Mie De Backer</dd>
        </div>
        <div class="credits-entry">
          <dt>{copy.communicationRole}</dt>
          <dd>Nicolas Van Herck</dd>
        </div>
        <div class="credits-entry">
          <dt>{copy.developmentRole}</dt>
          <dd>Frederik De Bleser</dd>
        </div>
        <div class="credits-entry">
          <dt>{copy.designRole}</dt>
          <dd>Chloé D'Hauwe</dd>
        </div>
      </dl>
      <p class="credits-source">
        {copy.codeNote.split("GitHub")[0]}
        <a href="https://github.com/fdb/sintlucasmasters/" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        .
      </p>
    </div>
  );
};
