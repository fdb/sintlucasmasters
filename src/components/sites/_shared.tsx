// Shared bits used by every site template — search box markup and the small
// pieces of UI copy that don't differ between sites. Per-site copy (titles,
// taglines, nav labels, footer text) lives inside each template file.

import type { FC } from "hono/jsx";
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

export const TopBar: FC<{ locale: PublicLocale; nlPath: string; enPath: string; logo?: string }> = ({
  locale,
  nlPath,
  enPath,
  logo,
}) => {
  const copy = SHARED_COPY[locale];
  return (
    <div class="top-bar">
      <div class="top-bar-inner">
        <a
          href="https://www.sintlucasantwerpen.be/"
          class="top-bar-logo"
          aria-label="Sint Lucas Antwerpen Website"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={logo ?? "/logo-white.svg"} alt="Sint Lucas Antwerpen" />
        </a>
        <div class="locale-switch locale-switch--top" aria-label={copy.localeLabel}>
          <a href={nlPath} class={locale === "nl" ? "active" : ""}>
            NL
          </a>
          <a href={enPath} class={locale === "en" ? "active" : ""}>
            EN
          </a>
        </div>
      </div>
    </div>
  );
};
