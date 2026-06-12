// Shared bits used by every site template — search box markup and the small
// pieces of UI copy that don't differ between sites. Per-site copy (titles,
// taglines, nav labels, footer text) lives inside each template file.

import type { Child, FC } from "hono/jsx";
import type { PublicLocale } from "../../lib/i18n";

const SHARED_COPY = {
  en: {
    searchAria: "Search projects",
    searchLabel: "Search projects",
    searchPlaceholder: "Search projects or students",
    searchMin: "Type at least 2 characters.",
    searchLoading: "Searching...",
    searchUnavailable: "Search unavailable. Try again.",
    searchEmpty: "No results found.",
    searchSingular: "result",
    searchPlural: "results",
    localeLabel: "Language",
  },
  nl: {
    searchAria: "Zoek projecten",
    searchLabel: "Zoek projecten",
    searchPlaceholder: "Zoek op project of student",
    searchMin: "Typ minstens 2 tekens.",
    searchLoading: "Zoeken...",
    searchUnavailable: "Zoeken is tijdelijk niet beschikbaar.",
    searchEmpty: "Geen resultaten gevonden.",
    searchSingular: "resultaat",
    searchPlural: "resultaten",
    localeLabel: "Taal",
  },
} as const;

// Event identity shown big in the public header. All three are locale- and
// site-independent — same glyphs everywhere — so they live here, not in the
// per-site copy. Ordered by importance (title > dates > year); the header drops
// them right-to-left as the band narrows (see @container rules in styles.css).
const EVENT_TITLE = "GRADUATION TOUR";
const EVENT_DATE = "17–21.06";
const EVENT_YEAR = "2026";

export function getSharedCopy(locale: PublicLocale): (typeof SHARED_COPY)[PublicLocale] {
  return SHARED_COPY[locale];
}

export const SearchBox: FC<{ locale: PublicLocale }> = ({ locale }) => {
  const copy = SHARED_COPY[locale];
  return (
    <div
      class="site-search"
      data-site-search
      data-open="false"
      data-search-locale={locale}
      data-search-min-message={copy.searchMin}
      data-search-loading-message={copy.searchLoading}
      data-search-unavailable-message={copy.searchUnavailable}
      data-search-empty-message={copy.searchEmpty}
      data-search-results-singular={copy.searchSingular}
      data-search-results-plural={copy.searchPlural}
    >
      <button class="search-toggle" type="button" aria-label={copy.searchAria} aria-expanded="false" data-search-toggle>
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
  );
};

// The shared top band for every public site. Layout is one horizontal row:
//
//   [brand]  <lead description>                          NL EN
//            GRADUATION TOUR  17–21.06            2026
//
// The brand mark holds three stacked layers, cross-faded by CSS on the header's
// collapse state and by /header.js for the animation:
//   • brand-logo  — static "Graduation Tour" squiggle (expanded, the always-safe base)
//   • brand-video — animated version, swapped in only when expanded + motion allowed
//   • brand-eyes  — the eyes mark, shown once collapsed (small, recognisable)
// header.js drives the animation via the data-site-eyes / data-site-eyes-video hooks.
//
// The "band" is a CSS container (container-type: inline-size). Both text rows
// are sized in cqi units so they scale to fill the band's width at any viewport
// — the headline reaches the right edge with no gap before the year. @container
// breakpoints in styles.css drop the lead, then the year, then the date as the
// band narrows, in reverse importance order.
//
// Only the lead sentence differs per site (passed as children); title/date/year
// and the language switch are identical everywhere. The sr-only <h1> carries the
// site title for SEO/AT, since the visible heading is split across coloured spans.
export const PublicHeader: FC<{
  locale: PublicLocale;
  nlPath: string;
  enPath: string;
  title: string;
  children?: Child;
}> = ({ locale, nlPath, enPath, title, children }) => {
  const copy = SHARED_COPY[locale];
  return (
    <header class="site-header site-header--public" data-site-header>
      <div class="header-inner">
        <a href={`/${locale}/`} class="header-brand" data-site-eyes aria-label={title}>
          <img class="brand-logo" src="/graduation-tour-logo.png" alt="" />
          <video class="brand-video" data-site-eyes-video muted loop playsinline preload="none">
            <source src="/graduation-tour-animation.mp4" type="video/mp4" />
          </video>
          <img class="brand-eyes" src="/graduation-tour-eyes.png" alt="" />
        </a>
        <div class="header-band">
          <h1 class="site-title sr-only">{title}</h1>
          <p class="header-lead">{children}</p>
          <p class="header-headline" aria-hidden="true">
            <span class="hl-title">{EVENT_TITLE}</span> <span class="hl-date">{EVENT_DATE}</span>{" "}
            <span class="hl-year">{EVENT_YEAR}</span>
          </p>
        </div>
        <div class="locale-switch header-locale" aria-label={copy.localeLabel}>
          <a href={nlPath} class={locale === "nl" ? "active" : ""}>
            NL
          </a>
          <a href={enPath} class={locale === "en" ? "active" : ""}>
            EN
          </a>
        </div>
      </div>
    </header>
  );
};
