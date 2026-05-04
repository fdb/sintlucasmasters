// Multi-domain site registry.
//
// One Worker serves three public domains. The Host header (or, in dev, a
// ?__site=<id> override) is resolved to a SiteConfig by `siteMiddleware`,
// which sets it on the Hono context. All public handlers should read
// c.var.site rather than branching on hostname themselves.

export const PROGRAMME_CODES = ["MA_BK", "PREMA_BK", "BA_FO", "BA_BK"] as const;
export type ProgrammeCode = (typeof PROGRAMME_CODES)[number];

export type SiteId = "masters" | "fotografie" | "graduates";

export interface SiteNavLink {
  programme: ProgrammeCode;
  label: { nl: string; en: string };
}

export interface SiteConfig {
  id: SiteId;
  hostname: string;
  aliases?: string[];
  siteName: string;
  programmes: ProgrammeCode[];
  nav?: SiteNavLink[];
  emailFrom?: string;
  logo?: string;
  ogImage?: string;
}

export const DEFAULT_SITE_ID: SiteId = "graduates";

const PROGRAMME_TO_SLUG: Record<ProgrammeCode, string> = {
  MA_BK: "ma-bk",
  PREMA_BK: "prema-bk",
  BA_FO: "ba-fo",
  BA_BK: "ba-bk",
};

const SLUG_TO_PROGRAMME: Record<string, ProgrammeCode> = Object.fromEntries(
  (Object.entries(PROGRAMME_TO_SLUG) as [ProgrammeCode, string][]).map(([code, slug]) => [slug, code])
) as Record<string, ProgrammeCode>;

export function programmeToSlug(code: ProgrammeCode): string {
  return PROGRAMME_TO_SLUG[code];
}

export function slugToProgramme(slug: string): ProgrammeCode | null {
  return SLUG_TO_PROGRAMME[slug] ?? null;
}

export const SITES: SiteConfig[] = [
  {
    id: "masters",
    hostname: "sintlucasmasters.com",
    aliases: ["www.sintlucasmasters.com"],
    siteName: "Sint Lucas Masters Graduation Tour",
    programmes: ["MA_BK", "PREMA_BK"],
  },
  {
    id: "fotografie",
    hostname: "sintlucasfotografie.com",
    aliases: ["www.sintlucasfotografie.com"],
    siteName: "Sint Lucas Fotografie",
    programmes: ["BA_FO"],
  },
  {
    id: "graduates",
    hostname: "sintlucasgraduates.com",
    aliases: ["www.sintlucasgraduates.com"],
    siteName: "Sint Lucas Graduates",
    // BA_BK omitted for now — added when bachelors come online.
    programmes: ["MA_BK", "PREMA_BK", "BA_FO"],
    nav: [
      { programme: "BA_FO", label: { nl: "fotografie", en: "photography" } },
      { programme: "MA_BK", label: { nl: "master", en: "masters" } },
      { programme: "PREMA_BK", label: { nl: "premaster", en: "premasters" } },
    ],
  },
];

const SITES_BY_ID = Object.fromEntries(SITES.map((s) => [s.id, s])) as Record<SiteId, SiteConfig>;

export function getSite(id: SiteId): SiteConfig {
  return SITES_BY_ID[id];
}

// Build a hostname → SiteConfig lookup. Uses canonical hostname + any aliases.
const SITES_BY_HOST: Record<string, SiteConfig> = (() => {
  const map: Record<string, SiteConfig> = {};
  for (const site of SITES) {
    map[site.hostname.toLowerCase()] = site;
    for (const alias of site.aliases ?? []) {
      map[alias.toLowerCase()] = site;
    }
  }
  return map;
})();

// Strip port and lowercase. localhost, *.workers.dev, anything unknown returns null.
function normalizeHost(host: string | undefined | null): string | null {
  if (!host) return null;
  const trimmed = host.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed.split(":")[0];
}

export function isProductionHost(host: string | undefined | null): boolean {
  const normalized = normalizeHost(host);
  return normalized != null && normalized in SITES_BY_HOST;
}

// Resolve the Host header (or any explicit hostname) to a SiteConfig.
// Anything not matching a registered hostname falls back to DEFAULT_SITE_ID.
// That covers localhost dev, *.workers.dev preview deploys, and any future staging host.
export function resolveSite(host: string | undefined | null): SiteConfig {
  const normalized = normalizeHost(host);
  if (normalized && SITES_BY_HOST[normalized]) {
    return SITES_BY_HOST[normalized];
  }
  return SITES_BY_ID[DEFAULT_SITE_ID];
}

// SEO canonical rule: a project's canonical lives on the *primary* site for its
// programme. MA_BK / PREMA_BK → masters; BA_FO → fotografie. Graduates is
// never canonical — it's the umbrella view.
export function primarySiteFor(code: ProgrammeCode): SiteConfig {
  for (const site of SITES) {
    if (site.id === "graduates") continue;
    if (site.programmes.includes(code)) return site;
  }
  // Fall back to graduates if we ever add a programme that has no primary site
  // (e.g. BA_BK before it gets its own home). Better than throwing at runtime.
  return SITES_BY_ID[DEFAULT_SITE_ID];
}
