// Graduates site (sintlucasgraduates.com) — header + footer.
// Edit this file to change the chrome on the umbrella graduates domain.
//
// Unlike the masters and fotografie sites, this template renders programme
// "filter chips" sourced from SiteConfig.nav. To add a new filter (e.g.
// bachelors when they go live), append an entry to graduates.nav in
// src/sites.ts — no edits to this template needed.

import type { FC } from "hono/jsx";
import type { PublicLocale } from "../../lib/i18n";
import { CURRENT_YEAR } from "../../config";
import { type SiteConfig, programmeToSlug } from "../../sites";
import { SearchBox } from "./_shared";

const COPY = {
  en: {
    title: "Sint Lucas Graduates",
    tagline: `Graduation work from the ${CURRENT_YEAR} students at Sint Lucas Antwerpen.`,
    navAll: "all",
    navProjects: "projects",
    navArchive: "archive",
    navAbout: "about",
    footerProgramme: "Sint Lucas Antwerpen",
    footerSub: "School of Arts in the heart of Antwerp.",
    footerLinkOne: "Explore our programmes",
    footerNote: "Sint Lucas Antwerpen, School of Arts, is part of KdG University of Applied Sciences and Arts.",
    footerLinkTwo: "Apply now - admission requirements & application",
    footerPrivacy: "Terms of Use & Privacy",
    programmeUrl: "https://www.sintlucasantwerpen.be/en/get-to-know-our-study-programmes/",
    applyUrl: "https://www.kdg.be/en/programmes",
  },
  nl: {
    title: "Sint Lucas Graduates",
    tagline: `Afstudeerwerk van de ${CURRENT_YEAR} studenten van Sint Lucas Antwerpen.`,
    navAll: "alle",
    navProjects: "projecten",
    navArchive: "archief",
    navAbout: "over",
    footerProgramme: "Sint Lucas Antwerpen",
    footerSub: "School of Arts in het hart van Antwerpen.",
    footerLinkOne: "Ontdek onze opleidingen",
    footerNote: "Sint Lucas Antwerpen, School of Arts, maakt deel uit van KdG Hogeschool.",
    footerLinkTwo: "Schrijf je in - toelatingsvoorwaarden en aanvraag",
    footerPrivacy: "Gebruiksvoorwaarden & privacy",
    programmeUrl: "https://www.sintlucasantwerpen.be/opleidingen/",
    applyUrl: "https://www.kdg.be/opleidingen",
  },
} as const;

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
            <p class="site-tagline">{copy.tagline}</p>
          </a>
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
