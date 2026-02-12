import type { FC, PropsWithChildren } from "hono/jsx";
import { CURRENT_YEAR } from "../config";

type PublicLocale = "nl" | "en";

type LayoutProps = PropsWithChildren<{
  title?: string;
  locale: PublicLocale;
  currentPath: string;
  ogImage?: string | null;
  ogDescription?: string;
  ogUrl?: string;
  ogType?: "website" | "article";
  canonicalUrl?: string;
  hideSubheader?: boolean;
  jsonLd?: object | object[];
}>;

const SITE_NAME = "Sint Lucas Masters Graduation Tour";
const SITE_URL = "https://sintlucasmasters.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

const COPY = {
  en: {
    defaultDescription: "Presenting the graduation projects of the Masters in Art and Design at Sint Lucas Antwerpen.",
    title: "Graduation Tour",
    tagline: `Presenting the graduation projects of the ${CURRENT_YEAR} Masters in Art and Design at Sint Lucas Antwerpen.`,
    navProjects: "projects",
    navArchive: "archive",
    navAbout: "about",
    searchAria: "Search projects",
    searchLabel: "Search projects",
    searchPlaceholder: "Search projects or students",
    footerProgramme: "Our Master's programme",
    footerSub: "The start of your professional career.",
    footerLinkOne: "Explore the Master of Visual Arts",
    footerNote: "Sint Lucas Antwerpen, School of Arts, is part of KdG University of Applied Sciences and Arts.",
    footerLinkTwo: "Apply now - admission requirements, tuition fees & application",
    footerPrivacy: "Terms of Use & Privacy",
    localeLabel: "Language",
  },
  nl: {
    defaultDescription: "Ontdek de afstudeerprojecten van de masters in kunst en design van Sint Lucas Antwerpen.",
    title: "Afstudeerexpo",
    tagline: `Met de afstudeerprojecten van de ${CURRENT_YEAR} masters in kunst en design van Sint Lucas Antwerpen.`,
    navProjects: "projecten",
    navArchive: "archief",
    navAbout: "over",
    searchAria: "Zoek projecten",
    searchLabel: "Zoek projecten",
    searchPlaceholder: "Zoek op project of student",
    footerProgramme: "Onze masteropleiding",
    footerSub: "De start van je professionele carrière.",
    footerLinkOne: "Ontdek de Master of Visual Arts",
    footerNote: "Sint Lucas Antwerpen, School of Arts, maakt deel uit van KdG Hogeschool.",
    footerLinkTwo: "Schrijf je in - toelatingsvoorwaarden, studiegeld en aanvraag",
    footerPrivacy: "Gebruiksvoorwaarden & privacy",
    localeLabel: "Taal",
  },
} as const;

function localeToHtmlLang(locale: PublicLocale): "en-BE" | "nl-BE" {
  return locale === "nl" ? "nl-BE" : "en-BE";
}

function toLocalePath(currentPath: string, targetLocale: PublicLocale): string {
  const [pathname, query] = currentPath.split("?");
  const withoutLocale = pathname.replace(/^\/(en|nl)(?=\/|$)/, "") || "/";
  const targetPath = `/${targetLocale}${withoutLocale === "/" ? "" : withoutLocale}`;
  return query ? `${targetPath}?${query}` : targetPath;
}

export const Layout: FC<LayoutProps> = ({
  title,
  locale,
  currentPath,
  ogImage,
  ogDescription,
  ogUrl,
  ogType,
  canonicalUrl,
  hideSubheader,
  jsonLd,
  children,
}) => {
  const copy = COPY[locale];
  const pageTitle = title ? `${title} - ${SITE_NAME}` : SITE_NAME;
  const description = ogDescription || copy.defaultDescription;
  const finalOgImage = ogImage || DEFAULT_OG_IMAGE;
  const finalOgType = ogType ?? (ogImage ? "article" : "website");
  const nlPath = toLocalePath(currentPath, "nl");
  const enPath = toLocalePath(currentPath, "en");

  return (
    <html lang={localeToHtmlLang(locale)}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta name="view-transition" content="same-origin" />

        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content={finalOgType} />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        <meta property="og:image" content={finalOgImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={finalOgImage} />

        {jsonLd &&
          (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((data, i) => (
            <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
          ))}

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        <link rel="stylesheet" href="/styles.css" />
        <script src="/search.js" defer />
      </head>
      <body>
        <div class="top-bar">
          <div class="top-bar-inner">
            <a
              href="https://www.sintlucasantwerpen.be/"
              class="top-bar-logo"
              aria-label="Sint Lucas Antwerpen Website"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/logo-white.svg" alt="Sint Lucas Antwerpen" />
            </a>
            <div class="locale-switch locale-switch--top" aria-label={copy.localeLabel}>
              <a href={enPath} class={locale === "en" ? "active" : ""}>
                EN
              </a>
              <a href={nlPath} class={locale === "nl" ? "active" : ""}>
                NL
              </a>
            </div>
          </div>
        </div>
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
                <div
                  class="site-search"
                  data-site-search
                  data-open="false"
                  data-search-locale={locale}
                  data-search-min-message={locale === "nl" ? "Typ minstens 2 tekens." : "Type at least 2 characters."}
                  data-search-loading-message={locale === "nl" ? "Zoeken..." : "Searching..."}
                  data-search-unavailable-message={
                    locale === "nl" ? "Zoeken is tijdelijk niet beschikbaar." : "Search unavailable. Try again."
                  }
                  data-search-empty-message={locale === "nl" ? "Geen resultaten gevonden." : "No results found."}
                  data-search-results-singular={locale === "nl" ? "resultaat" : "result"}
                  data-search-results-plural={locale === "nl" ? "resultaten" : "results"}
                >
                  <button
                    class="search-toggle"
                    type="button"
                    aria-label={copy.searchAria}
                    aria-expanded="false"
                    data-search-toggle
                  >
                    <svg
                      class="search-toggle-icon"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none" />
                      <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                    </svg>
                  </button>
                  <div class="search-field" data-search-field>
                    <label class="sr-only" for="site-search-input">
                      {copy.searchLabel}
                    </label>
                    <input
                      id="site-search-input"
                      class="search-input"
                      type="search"
                      placeholder={copy.searchPlaceholder}
                      autocomplete="off"
                      spellcheck={false}
                      data-search-input
                    />
                  </div>
                  <div class="sr-only" data-search-status aria-live="polite" />
                </div>
              </div>
            </div>
          </nav>
        )}
        <main>{children}</main>
        <footer class="site-footer">
          <div class="footer-inner">
            <div class="footer-top">
              <div class="footer-col footer-col--programme">
                <h3 class="footer-heading">{copy.footerProgramme}</h3>
                <p class="footer-sub">{copy.footerSub}</p>
                <a
                  href="https://www.sintlucasantwerpen.be/opleidingen/master-of-visual-arts/"
                  class="footer-arrow-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.footerLinkOne}
                </a>
                <p class="footer-note">{copy.footerNote}</p>
                <a
                  href="https://www.kdg.be/en/programmes/apply-english-taught-master-programme"
                  class="footer-arrow-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
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
      </body>
    </html>
  );
};
