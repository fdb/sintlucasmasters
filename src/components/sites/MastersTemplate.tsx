// Masters site (sintlucasmasters.com) — header + footer.
// Edit this file to change the chrome on the masters domain.

import type { FC } from "hono/jsx";
import type { PublicLocale } from "../../lib/i18n";
import { CURRENT_YEAR } from "../../config";
import { SearchBox } from "./_shared";

const COPY = {
  en: {
    title: "Graduation Tour",
    tagline: `Presenting the graduation projects of the ${CURRENT_YEAR} Masters in Art and Design at Sint Lucas Antwerpen.`,
    navProjects: "projects",
    navArchive: "archive",
    navAbout: "about",
    footerProgramme: "Our Master's programme",
    footerSub: "The start of your professional career.",
    footerLinkOne: "Explore the Master of Visual Arts",
    footerNote: "Sint Lucas Antwerpen, School of Arts, is part of KdG University of Applied Sciences and Arts.",
    footerLinkTwo: "Apply now - admission requirements, tuition fees & application",
    footerPrivacy: "Terms of Use & Privacy",
    programmeUrl: "https://www.sintlucasantwerpen.be/en/get-to-know-our-study-programmes/master-of-visual-arts/",
    applyUrl: "https://www.kdg.be/en/programmes/apply-english-taught-master-programme",
  },
  nl: {
    title: "Graduation Tour",
    tagline: `Met de afstudeerprojecten van de ${CURRENT_YEAR} masters in kunst en design van Sint Lucas Antwerpen.`,
    navProjects: "projecten",
    navArchive: "archief",
    navAbout: "over",
    footerProgramme: "Onze masteropleiding",
    footerSub: "De start van je professionele carrière.",
    footerLinkOne: "Ontdek de Master of Visual Arts",
    footerNote: "Sint Lucas Antwerpen, School of Arts, maakt deel uit van KdG Hogeschool.",
    footerLinkTwo: "Schrijf je in - toelatingsvoorwaarden, studiegeld en aanvraag",
    footerPrivacy: "Gebruiksvoorwaarden & privacy",
    programmeUrl: "https://www.sintlucasantwerpen.be/opleidingen/master/",
    applyUrl: "https://www.kdg.be/inschrijven/inschrijven-voor-de-master-beeldende-kunsten",
  },
} as const;

export const MastersHeader: FC<{ locale: PublicLocale; hideSubheader?: boolean }> = ({ locale, hideSubheader }) => {
  const copy = COPY[locale];
  return (
    <>
      <header class="site-header site-header--public">
        <div class="header-inner">
          <a href={`/${locale}/`} class="site-title-link">
            <h1 class="site-title">{copy.title}</h1>
            <p class="site-tagline">{copy.tagline}</p>
          </a>
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

export const MastersFooter: FC<{ locale: PublicLocale }> = ({ locale }) => {
  const copy = COPY[locale];
  return (
    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-col footer-col--programme">
            <h3 class="footer-heading">{copy.footerProgramme}</h3>
            <p class="footer-sub">{copy.footerSub}</p>
            <a href={copy.programmeUrl} class="footer-arrow-link" target="_blank" rel="noopener noreferrer">
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
