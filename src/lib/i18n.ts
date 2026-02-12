import type { ContextKey, Project } from "../types";

export const PUBLIC_LOCALES = ["nl", "en"] as const;
export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

export const DEFAULT_PUBLIC_LOCALE: PublicLocale = "nl";
export const PUBLIC_LOCALE_COOKIE = "slam_locale";

export function isPublicLocale(value: string | undefined | null): value is PublicLocale {
  return value === "nl" || value === "en";
}

export function toHtmlLang(locale: PublicLocale): "nl-BE" | "en-BE" {
  return locale === "nl" ? "nl-BE" : "en-BE";
}

const CONTEXT_LABELS = {
  en: {
    autonomous: { short: "Autonomous", full: "Autonomous Context" },
    applied: { short: "Applied", full: "Applied Context" },
    digital: { short: "Digital", full: "Digital Context" },
    sociopolitical: { short: "Socio-Political", full: "Socio-Political Context" },
    jewelry: { short: "Jewelry", full: "Jewelry Context" },
  },
  nl: {
    autonomous: { short: "Autonoom", full: "Autonome context" },
    applied: { short: "Toegepast", full: "Toegepaste context" },
    digital: { short: "Digitaal", full: "Digitale context" },
    sociopolitical: { short: "Socio-politiek", full: "Socio-politieke context" },
    jewelry: { short: "Juwelen", full: "Juwelencontext" },
  },
} satisfies Record<PublicLocale, Record<ContextKey, { short: string; full: string }>>;

export function getContextShortLabel(context: ContextKey, locale: PublicLocale): string {
  return CONTEXT_LABELS[locale][context].short;
}

export function getContextFullLabel(context: ContextKey, locale: PublicLocale): string {
  return CONTEXT_LABELS[locale][context].full;
}

const CONTEXT_ALIASES: Record<string, ContextKey> = {
  autonomous: "autonomous",
  "autonomous context": "autonomous",
  applied: "applied",
  "applied context": "applied",
  digital: "digital",
  "digital context": "digital",
  sociopolitical: "sociopolitical",
  "sociopolitical context": "sociopolitical",
  "socio-political": "sociopolitical",
  "socio-political context": "sociopolitical",
  jewelry: "jewelry",
  "jewelry context": "jewelry",
  juwelen: "jewelry",
  "juwelen context": "jewelry",
};

export function normalizeContextKey(input: string | null | undefined): ContextKey | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  return CONTEXT_ALIASES[normalized] ?? null;
}

export function getLocalizedProjectTitle(project: Project, locale: PublicLocale): string {
  if (locale === "nl") {
    return project.project_title_nl || project.project_title_en || "";
  }
  return project.project_title_en || project.project_title_nl || "";
}

export function getLocalizedProjectBio(project: Project, locale: PublicLocale): string {
  if (locale === "nl") {
    return project.bio_nl || project.bio_en || "";
  }
  return project.bio_en || project.bio_nl || "";
}

export function getLocalizedProjectDescription(project: Project, locale: PublicLocale): string {
  if (locale === "nl") {
    return project.description_nl || project.description_en || "";
  }
  return project.description_en || project.description_nl || "";
}

export function getLocalizedProjectLocation(project: Project, locale: PublicLocale): string {
  if (locale === "nl") {
    return project.location_nl || project.location_en || "";
  }
  return project.location_en || project.location_nl || "";
}
