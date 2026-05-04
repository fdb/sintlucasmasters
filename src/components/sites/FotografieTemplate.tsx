// Fotografie site (sintlucasfotografie.com) — header, footer, and About body.
// Edit this file to change the chrome on the photography domain.
//
// The 2025–2026 year is hard-coded (see MastersTemplate for rationale).
//
// Sanity-fix vs. comms email: Nicolas's draft said "Visit the Master Expo"
// on the photography site. That's a copy-paste from the masters version —
// changed to "Photography Expo" / "Fotografie Expo" here.

import type { FC } from "hono/jsx";
import type { PublicLocale } from "../../lib/i18n";
import { SearchBox } from "./_shared";

const PROGRAMME_URL_EN = "https://www.sintlucasantwerpen.be/en/get-to-know-our-study-programmes/photography/";
const PROGRAMME_URL_NL = "https://www.sintlucasantwerpen.be/opleidingen/fotografie/";
const EVENT_URL = "https://www.sintlucasantwerpen.be/kalender/graduation-tour-fotografie-2/";
// BA Fotografie is a Dutch-taught programme — both EN and NL use the Dutch enrolment page.
const APPLY_URL = "https://www.kdg.be/inschrijven/nederlandstalige-professionele-bachelor";

const COPY = {
  en: {
    title: "Graduation Tour Photography",
    navProjects: "projects",
    navArchive: "archive",
    navAbout: "about",
    footerProgramme: "Bachelor of Photography",
    footerSub: "Three years to find your eye.",
    footerLinkOne: "Explore the Bachelor of Photography",
    footerNote: "Sint Lucas Antwerpen, School of Arts, is part of KdG University of Applied Sciences and Arts.",
    footerLinkTwo: "Apply now - admission requirements & application (in Dutch)",
    footerPrivacy: "Terms of Use & Privacy",
  },
  nl: {
    title: "Graduation Tour Fotografie",
    navProjects: "projecten",
    navArchive: "archief",
    navAbout: "over",
    footerProgramme: "Bachelor in de Fotografie",
    footerSub: "Drie jaar om je blik te vinden.",
    footerLinkOne: "Ontdek de Bachelor in de Fotografie",
    footerNote: "Sint Lucas Antwerpen, School of Arts, maakt deel uit van KdG Hogeschool.",
    footerLinkTwo: "Schrijf je in - toelatingsvoorwaarden en aanvraag",
    footerPrivacy: "Gebruiksvoorwaarden & privacy",
  },
} as const;

const Tagline: FC<{ locale: PublicLocale }> = ({ locale }) => {
  if (locale === "nl") {
    return (
      <>
        Ontdek de afstudeerwerken van de afstudeerders in de{" "}
        <a href={PROGRAMME_URL_NL} target="_blank" rel="noopener noreferrer">
          Bachelor Fotografie
        </a>{" "}
        2025–2026. Bezoek de Fotografie Expo van 17 t.e.m. 21 juni tijdens{" "}
        <a href={EVENT_URL} target="_blank" rel="noopener noreferrer">
          GRADUATION TOUR 2026
        </a>
        .
      </>
    );
  }
  return (
    <>
      Discover the graduation projects of the{" "}
      <a href={PROGRAMME_URL_EN} target="_blank" rel="noopener noreferrer">
        Bachelor Photography graduates
      </a>{" "}
      2025–2026. Visit the Photography Expo from 17 to 21 June during{" "}
      <a href={EVENT_URL} target="_blank" rel="noopener noreferrer">
        GRADUATION TOUR 2026
      </a>
      .
    </>
  );
};

export const FotografieHeader: FC<{ locale: PublicLocale; hideSubheader?: boolean }> = ({ locale, hideSubheader }) => {
  const copy = COPY[locale];
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
              <a href={`/${locale}/`}>{copy.navProjects}</a>
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

export const FotografieFooter: FC<{ locale: PublicLocale }> = ({ locale }) => {
  const copy = COPY[locale];
  const programmeUrl = locale === "nl" ? PROGRAMME_URL_NL : PROGRAMME_URL_EN;
  return (
    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-col footer-col--programme">
            <h3 class="footer-heading">{copy.footerProgramme}</h3>
            <p class="footer-sub">{copy.footerSub}</p>
            <a href={programmeUrl} class="footer-arrow-link" target="_blank" rel="noopener noreferrer">
              {copy.footerLinkOne}
            </a>
            <p class="footer-note">{copy.footerNote}</p>
            <a href={APPLY_URL} class="footer-arrow-link" target="_blank" rel="noopener noreferrer">
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
    interestedHeading: "Interested in our Bachelor Photography programme?",
    programmeLabel: "Discover the Bachelor Photography",
    websiteLinkLabel: "Website",
    applyLabel: "Apply – admission requirements, tuition fees and application (in Dutch)",
    creditsHeading: "Credits",
    headRole: "Head of the Bachelor Photography",
    communicationRole: "Communication",
    developmentRole: "Development",
    designRole: "Design",
    codeNote: "The code for this website is free software, available on GitHub.",
  },
  nl: {
    interestedHeading: "Interesse in onze Bacheloropleiding Fotografie?",
    programmeLabel: "Ontdek de Bachelor Fotografie",
    websiteLinkLabel: "Website",
    applyLabel: "Schrijf je in - toelatingsvoorwaarden, studiegeld en aanvraag",
    creditsHeading: "Credits",
    headRole: "Hoofd van de Bachelor Fotografie",
    communicationRole: "Communicatie",
    developmentRole: "Ontwikkeling",
    designRole: "Vormgeving",
    codeNote: "De code van deze website is vrije software en beschikbaar op GitHub.",
  },
} as const;

export const FotografieAboutBody: FC<{ locale: PublicLocale }> = ({ locale }) => {
  const copy = ABOUT_COPY[locale];
  const programmeUrl = locale === "nl" ? PROGRAMME_URL_NL : PROGRAMME_URL_EN;
  return (
    <div class="about-content">
      <p class="about-text">
        {locale === "nl" ? (
          <>
            Deze website bevat de afstudeerwerken van de 3de Bachelor Fotografie 2025–2026 aan{" "}
            <a href="https://www.sintlucasantwerpen.be/" target="_blank" rel="noopener noreferrer">
              Sint Lucas Antwerpen
            </a>
            . Naast dit online platform zijn de werken ook fysiek te bezichtigen van 17 t.e.m. 21 juni tijdens{" "}
            <a href={EVENT_URL} target="_blank" rel="noopener noreferrer">
              GRADUATION TOUR 2026
            </a>
            .
          </>
        ) : (
          <>
            This website presents the graduation projects of the 3rd year Bachelor Photography 2025–2026 at{" "}
            <a href="https://www.sintlucasantwerpen.be/" target="_blank" rel="noopener noreferrer">
              Sint Lucas Antwerpen
            </a>
            . In addition to this online platform, the works can also be viewed physically from 17 to 21 June during{" "}
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
          <strong>{copy.programmeLabel}</strong>
        </p>
        <p class="programme-links">
          <a href={programmeUrl} target="_blank" rel="noopener noreferrer">
            {copy.websiteLinkLabel}
          </a>
          {" · "}
          <a href={APPLY_URL} target="_blank" rel="noopener noreferrer">
            {copy.applyLabel}
          </a>
        </p>
      </div>
      <h3>{copy.creditsHeading}</h3>
      <dl class="credits-list">
        <div class="credits-entry">
          <dt>{copy.headRole}</dt>
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
