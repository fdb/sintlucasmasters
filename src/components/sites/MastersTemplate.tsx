// Masters site (sintlucasmasters.com) — header, footer, and About body.
// Edit this file to change the chrome on the masters domain.
//
// The 2025–2026 year is hard-coded in the tagline and About copy rather than
// interpolated from CURRENT_YEAR, because the comms-approved copy is phrased
// specifically and does not always match the raw "YYYY-YYYY" constant.

import type { FC } from "hono/jsx";
import type { PublicLocale } from "../../lib/i18n";
import { SearchBox, PublicHeader } from "./_shared";

const PROGRAMME_URL_EN = "https://www.sintlucasantwerpen.be/en/get-to-know-our-study-programmes/master-of-visual-arts/";
const PROGRAMME_URL_NL = "https://www.sintlucasantwerpen.be/opleidingen/master/";
const EVENT_URL = "https://www.sintlucasantwerpen.be/kalender/graduation-tour-master-premaster-beeldende-kunsten/";
const APPLY_URL_EN = "https://www.kdg.be/en/programmes/apply-english-taught-master-programme";
const APPLY_URL_NL = "https://www.kdg.be/inschrijven/inschrijven-voor-de-master-beeldende-kunsten";

const COPY = {
  en: {
    title: "Graduation Tour Masters",
    lead: "Discover the graduation projects of the Master of Visual Arts 2025–2026.",
    navProjects: "projects",
    navArchive: "archive",
    navAbout: "about",
    footerProgramme: "Our Master's programme",
    footerSub: "The start of your professional career.",
    footerLinkOne: "Explore the Master of Visual Arts",
    footerNote: "Sint Lucas Antwerpen, School of Arts, is part of KdG University of Applied Sciences and Arts.",
    footerLinkTwo: "Apply now - admission requirements, tuition fees & application",
    footerPrivacy: "Terms of Use & Privacy",
  },
  nl: {
    title: "Graduation Tour Masters",
    lead: "Ontdek de afstudeerwerken van de Masters Beeldende Kunsten 2025–2026.",
    navProjects: "projecten",
    navArchive: "archief",
    navAbout: "over",
    footerProgramme: "Onze masteropleiding",
    footerSub: "De start van je professionele carrière.",
    footerLinkOne: "Ontdek de Master of Visual Arts",
    footerNote: "Sint Lucas Antwerpen, School of Arts, maakt deel uit van KdG Hogeschool.",
    footerLinkTwo: "Schrijf je in - toelatingsvoorwaarden, studiegeld en aanvraag",
    footerPrivacy: "Gebruiksvoorwaarden & privacy",
  },
} as const;

export const MastersHeader: FC<{ locale: PublicLocale; nlPath: string; enPath: string; hideSubheader?: boolean }> = ({
  locale,
  nlPath,
  enPath,
  hideSubheader,
}) => {
  const copy = COPY[locale];
  return (
    <>
      <PublicHeader locale={locale} nlPath={nlPath} enPath={enPath} title={copy.title}>
        {copy.lead}
      </PublicHeader>
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

export const MastersFooter: FC<{ locale: PublicLocale }> = ({ locale }) => {
  const copy = COPY[locale];
  const programmeUrl = locale === "nl" ? PROGRAMME_URL_NL : PROGRAMME_URL_EN;
  const applyUrl = locale === "nl" ? APPLY_URL_NL : APPLY_URL_EN;
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
            <a href={applyUrl} class="footer-arrow-link" target="_blank" rel="noopener noreferrer">
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
    interestedHeading: "Interested in our Master's programme?",
    programmeLabel: "Discover the Master of Visual Arts",
    websiteLinkLabel: "Website",
    applyLabel: "Apply – admission requirements, tuition fees and application",
    creditsHeading: "Credits",
    headRole: "Head of the Master",
    communicationRole: "Communication",
    developmentRole: "Development",
    designRole: "Design",
    codeNote: "The code for this website is free software, available on GitHub.",
  },
  nl: {
    interestedHeading: "Interesse in onze Masteropleiding?",
    programmeLabel: "Ontdek de Master in de Beeldende Kunsten",
    websiteLinkLabel: "Website",
    applyLabel: "Schrijf je in - toelatingsvoorwaarden, studiegeld en aanvraag",
    creditsHeading: "Credits",
    headRole: "Hoofd van de master",
    communicationRole: "Communicatie",
    developmentRole: "Ontwikkeling",
    designRole: "Vormgeving",
    codeNote: "De code van deze website is vrije software en beschikbaar op GitHub.",
  },
} as const;

export const MastersAboutBody: FC<{ locale: PublicLocale }> = ({ locale }) => {
  const copy = ABOUT_COPY[locale];
  const programmeUrl = locale === "nl" ? PROGRAMME_URL_NL : PROGRAMME_URL_EN;
  const applyUrl = locale === "nl" ? APPLY_URL_NL : APPLY_URL_EN;
  return (
    <div class="about-content">
      <p class="about-text">
        {locale === "nl" ? (
          <>
            Deze website bevat de afstudeerwerken van de Masters Beeldende Kunsten 2025–2026 aan{" "}
            <a href="https://www.sintlucasantwerpen.be/" target="_blank" rel="noopener noreferrer">
              Sint Lucas Antwerpen
            </a>
            . Naast dit online platform zijn de werken ook fysiek te bezichtigen van 17 tot en met 21 juni tijdens{" "}
            <a href={EVENT_URL} target="_blank" rel="noopener noreferrer">
              GRADUATION TOUR 2026
            </a>
            .
          </>
        ) : (
          <>
            This website presents the graduation projects of the Master of Visual Arts 2025–2026 at{" "}
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
          <a href={applyUrl} target="_blank" rel="noopener noreferrer">
            {copy.applyLabel}
          </a>
        </p>
      </div>
      <h3>{copy.creditsHeading}</h3>
      <dl class="credits-list">
        <div class="credits-entry">
          <dt>{copy.headRole}</dt>
          <dd>Reg Herygers</dd>
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
