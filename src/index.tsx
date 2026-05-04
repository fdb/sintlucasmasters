import { Hono } from "hono";
import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import { secureHeaders } from "hono/secure-headers";
import * as Sentry from "@sentry/cloudflare";
import { Layout } from "./components/Layout";
import { MastersAboutBody } from "./components/sites/MastersTemplate";
import { FotografieAboutBody } from "./components/sites/FotografieTemplate";
import { GraduatesAboutBody } from "./components/sites/GraduatesTemplate";
import { ProjectCard } from "./components/ProjectCard";
import { RichDescription } from "./lib/video-embed";
import type { Bindings, ContextKey, Project, ProjectImage, ProjectWithMainImage } from "./types";
import { CONTEXT_KEYS, getImageUrl, getStudentUrl } from "./types";
import { CURRENT_YEAR } from "./config";
import {
  type ProgrammeCode,
  type SiteConfig,
  PROGRAMME_CODES,
  primarySiteFor,
  programmeToSlug,
  resolveSite,
  slugToProgramme,
} from "./sites";
import { siteMiddleware } from "./middleware/site";
import { authApiRoutes, authPageRoutes } from "./routes/auth";
import { adminPageRoutes } from "./routes/admin";
import { adminApiRoutes } from "./routes/admin-api";
import { renderToString } from "hono/jsx/dom/server";
import {
  DEFAULT_PUBLIC_LOCALE,
  PUBLIC_LOCALE_COOKIE,
  getContextFullLabel,
  getContextShortLabel,
  getLocalizedProjectBio,
  getLocalizedProjectDescription,
  getLocalizedProjectLocation,
  getLocalizedProjectTitle,
  getProjectMetaLabel,
  isPublicLocale,
} from "./lib/i18n";

export const app = new Hono<{ Bindings: Bindings }>();

app.use("*", secureHeaders());

type PublicLocale = "nl" | "en";

type LocalizedProject = ProjectWithMainImage & {
  project_title: string;
  bio: string | null;
  description: string;
  location: string | null;
};

// Per-request site URL — derived from c.var.site.hostname inside handlers.
function siteUrlFor(site: SiteConfig): string {
  return `https://${site.hostname}`;
}

const TEXT = {
  en: {
    projects: "projects",
    projecten: "projects",
    archive: "archive",
    about: "about",
    context: "Context",
    year: "Year",
    all: "all",
    notFound: "Not Found",
    pageNotFound: "Page not found",
    returnToHomepage: "Return to Homepage",
    noProjectsForYear: "No projects found for this year.",
    goToCurrentYear: "Go to current year",
    noProjectsForContext: "No projects found for this context.",
    noProjects: "No projects found.",
    home: "Home",
    back: "Back",
    studentNotFound: "Student not found.",
    studentLinks: "Student links",
    detailAbout: "About",
    detailProject: "Project",
    aboutTitle: "About",
    yearDescriptionPrefix: "Discover",
    yearDescriptionMiddle: "graduation projects from Sint Lucas Masters",
    yearDescriptionSuffix: "Explore works across Autonomous, Applied, Digital, Socio-Political, and Jewelry contexts.",
    archiveDescriptionPrefix: "Browse",
    archiveDescriptionMiddle: "master thesis projects from Sint Lucas Antwerpen spanning",
    localeCode: "en",
  },
  nl: {
    projects: "projecten",
    projecten: "projecten",
    archive: "archief",
    about: "over",
    context: "Context",
    year: "Jaar",
    all: "alle",
    notFound: "Niet gevonden",
    pageNotFound: "Pagina niet gevonden",
    returnToHomepage: "Terug naar de startpagina",
    noProjectsForYear: "Geen projecten gevonden voor dit jaar.",
    goToCurrentYear: "Ga naar huidig jaar",
    noProjectsForContext: "Geen projecten gevonden voor deze context.",
    noProjects: "Geen projecten gevonden.",
    home: "Home",
    back: "Terug",
    studentNotFound: "Student niet gevonden.",
    studentLinks: "Studentlinks",
    detailAbout: "Over",
    detailProject: "Project",
    aboutTitle: "Over",
    yearDescriptionPrefix: "Ontdek",
    yearDescriptionMiddle: "afstudeerprojecten van Sint Lucas Masters",
    yearDescriptionSuffix: "Verken werk binnen autonome, toegepaste, digitale, socio-politieke en juwelencontexten.",
    archiveDescriptionPrefix: "Bekijk",
    archiveDescriptionMiddle: "masterprojecten van Sint Lucas Antwerpen van",
    localeCode: "nl",
  },
} as const;

declare const GIT_HASH: string;

// Health check endpoint
app.get("/api/health", async (c) => {
  try {
    await c.env.DB.prepare("SELECT 1").first();
    return c.json({ status: "ok", db: "connected", version: typeof GIT_HASH !== "undefined" ? GIT_HASH : "dev" });
  } catch (e) {
    console.error("Health check DB failure:", e);
    return c.json({ status: "error", db: "unreachable" }, 503);
  }
});

// Sentry tunnel endpoint
app.post("/api/sentry-tunnel", async (c) => {
  const { SENTRY_HOST, SENTRY_PROJECT_ID } = c.env;
  const body = await c.req.text();
  const [headerLine] = body.split("\n");
  const header = JSON.parse(headerLine);
  const dsn = new URL(header.dsn);
  const projectId = dsn.pathname.replace("/", "");

  if (dsn.host !== SENTRY_HOST || projectId !== SENTRY_PROJECT_ID) {
    return c.json({ error: "Invalid DSN" }, 403);
  }

  const response = await fetch(`https://${SENTRY_HOST}/api/${projectId}/envelope/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-sentry-envelope" },
    body,
  });
  return new Response(response.body, { status: response.status });
});

app.route("/api/auth", authApiRoutes);
app.route("/auth", authPageRoutes);
app.route("/api/admin", adminApiRoutes);
app.route("/admin", adminPageRoutes);

// Public-site middleware: every route below this point gets c.var.site set
// from the Host header (or ?__site=/X-Site-Override in dev). Admin and auth
// routes above are intentionally site-agnostic.
app.use("*", siteMiddleware);

const escapeLikeValue = (value: string) => value.replace(/[\\%_]/g, "\\$&");

function organizationSchemaFor(site: SiteConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Sint Lucas Antwerpen",
    url: siteUrlFor(site),
  };
}

function setLocalePreference(c: Context<{ Bindings: Bindings }>, locale: PublicLocale) {
  const isSecure = new URL(c.req.url).protocol === "https:";
  setCookie(c, PUBLIC_LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "Lax",
    secure: isSecure,
    maxAge: 60 * 60 * 24 * 365,
  });
}

function requestPathWithQuery(c: Context<{ Bindings: Bindings }>): string {
  const url = new URL(c.req.url);
  return `${url.pathname}${url.search}`;
}

function contextFromQuery(context: string | undefined): ContextKey | null {
  if (!context) return null;
  const normalized = context.trim().toLowerCase();
  return CONTEXT_KEYS.includes(normalized as ContextKey) ? (normalized as ContextKey) : null;
}

function isAcademicYearSegment(value: string): boolean {
  return /^\d{4}-\d{4}$/.test(value);
}

function localizeProject(project: ProjectWithMainImage, locale: PublicLocale): LocalizedProject {
  return {
    ...project,
    project_title: getLocalizedProjectTitle(project, locale),
    bio: getLocalizedProjectBio(project, locale),
    description: getLocalizedProjectDescription(project, locale),
    location: getLocalizedProjectLocation(project, locale) || null,
  };
}

type ListingOptions = {
  locale: PublicLocale;
  year: string;
  // Single programme = programme listing page; null/undefined = site default.
  programme?: ProgrammeCode | null;
  // Context filter — only meaningful when programme has contexts (MA_BK/PREMA_BK).
  context?: ContextKey | null;
  // Title shown in the page chrome (e.g. "2024-2025" or "Master 2024-2025").
  title: string;
  canonicalUrl: string;
};

// Programmes that have a context taxonomy. BA_FO / BA_BK don't.
const PROGRAMMES_WITH_CONTEXT: ReadonlySet<ProgrammeCode> = new Set<ProgrammeCode>(["MA_BK", "PREMA_BK"]);

const renderListing = async (c: Context<{ Bindings: Bindings }>, options: ListingOptions) => {
  const site = c.var.site;
  const { locale, year, programme, context, title, canonicalUrl } = options;
  const text = TEXT[locale];
  setLocalePreference(c, locale);

  const programmesToShow: ProgrammeCode[] = programme ? [programme] : site.programmes;

  let query = `SELECT p.*,
    (
      SELECT cloudflare_id
      FROM project_images
      WHERE project_id = p.id AND type = 'web'
      ORDER BY sort_order ASC, id ASC
      LIMIT 1
    ) AS main_image_id
    FROM projects p
    WHERE p.academic_year = ? AND p.status = 'published'`;
  const params: string[] = [year];

  if (programmesToShow.length > 0) {
    query += ` AND p.program IN (${programmesToShow.map(() => "?").join(",")})`;
    params.push(...programmesToShow);
  }

  if (context) {
    query += " AND p.context = ?";
    params.push(context);
  }

  query += " ORDER BY p.sort_name";

  const { results: projects } = await c.env.DB.prepare(query)
    .bind(...params)
    .all<ProjectWithMainImage>();

  const localizedProjects = projects.map((project) => localizeProject(project, locale));

  if (localizedProjects.length === 0 && !context && !programme) {
    return c.html(
      <Layout site={site} locale={locale} currentPath={requestPathWithQuery(c)} title={text.notFound}>
        <p>{text.noProjectsForYear}</p>
        <a href={`/${locale}/${CURRENT_YEAR}/`}>{text.goToCurrentYear}</a>
      </Layout>,
      404
    );
  }

  const description = `${text.yearDescriptionPrefix} ${localizedProjects.length} ${text.yearDescriptionMiddle} ${year}. ${text.yearDescriptionSuffix}`;
  const collectionName = context ? `${getContextFullLabel(context, locale)} - ${year}` : `${year} ${text.projects}`;
  const siteUrl = siteUrlFor(site);
  const itemList = {
    "@type": "ItemList",
    itemListElement: localizedProjects.map((project, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteUrl}${getStudentUrl(project, locale)}`,
      name: project.project_title,
    })),
  };
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": canonicalUrl,
    url: canonicalUrl,
    name: collectionName,
    description,
    mainEntity: itemList,
  };

  // Show the context filter only on a programme listing whose programme has
  // a context taxonomy. The site default homepage has no context filter
  // (would mix programmes), and BA_FO/BA_BK have no contexts.
  const showContextFilter = programme != null && PROGRAMMES_WITH_CONTEXT.has(programme);
  const programmeBasePath = programme ? `/${locale}/${year}/${programmeToSlug(programme)}` : null;

  return c.html(
    <Layout
      site={site}
      locale={locale}
      currentPath={requestPathWithQuery(c)}
      title={title}
      canonicalUrl={canonicalUrl}
      ogDescription={description}
      jsonLd={[organizationSchemaFor(site), collectionSchema]}
    >
      {showContextFilter && programmeBasePath && (
        <div class="page-filters">
          <ContextFilter locale={locale} basePath={programmeBasePath} activeContext={context ?? null} showLabel />
        </div>
      )}
      <div class="grid" data-project-grid data-show-year="false">
        {localizedProjects.map((project) => (
          <ProjectCard project={project} localePrefix={locale} />
        ))}
      </div>
      {localizedProjects.length === 0 && <p class="empty-state">{text.noProjectsForContext}</p>}
    </Layout>
  );
};

app.get("/robots.txt", (c) => {
  const siteUrl = siteUrlFor(c.var.site);
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /auth
Sitemap: ${siteUrl}/sitemap.xml
`;
  return c.text(robotsTxt, 200, { "Content-Type": "text/plain" });
});

app.get("/sitemap.xml", async (c) => {
  // Each domain serves a sitemap of *its own* programmes only. Cross-domain
  // project URLs technically work, but listing them here would invite duplicate
  // content penalties — the canonical URL points to the primary site anyway.
  const site = c.var.site;
  const siteUrl = siteUrlFor(site);
  const placeholders = site.programmes.map(() => "?").join(",");

  const { results: projects } = await c.env.DB.prepare(
    `SELECT academic_year, slug, program, updated_at
       FROM projects
      WHERE status = 'published'
        AND program IN (${placeholders})
      ORDER BY academic_year DESC, sort_name`
  )
    .bind(...site.programmes)
    .all<{ academic_year: string; slug: string; program: string | null; updated_at: string | null }>();

  const years = [...new Set(projects.map((p) => p.academic_year))];

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return new Date().toISOString().split("T")[0];
    return dateStr.split("T")[0];
  };

  const today = new Date().toISOString().split("T")[0];
  const urls: string[] = [];

  for (const locale of ["nl", "en"] as const) {
    urls.push(`  <url>
    <loc>${siteUrl}/${locale}/</loc>
    <lastmod>${today}</lastmod>
    <priority>1.0</priority>
  </url>`);
    urls.push(`  <url>
    <loc>${siteUrl}/${locale}/about</loc>
    <lastmod>${today}</lastmod>
    <priority>0.5</priority>
  </url>`);
    urls.push(`  <url>
    <loc>${siteUrl}/${locale}/archive</loc>
    <lastmod>${today}</lastmod>
    <priority>0.6</priority>
  </url>`);

    for (const year of years) {
      const yearProjects = projects.filter((p) => p.academic_year === year);
      const latestUpdate = yearProjects.reduce((latest, p) => {
        const pDate = p.updated_at || "";
        return pDate > latest ? pDate : latest;
      }, "");

      urls.push(`  <url>
      <loc>${siteUrl}/${locale}/${year}/</loc>
      <lastmod>${formatDate(latestUpdate)}</lastmod>
      <priority>0.7</priority>
    </url>`);

      for (const programme of site.programmes) {
        const slug = programmeToSlug(programme);
        urls.push(`  <url>
      <loc>${siteUrl}/${locale}/${year}/${slug}/</loc>
      <lastmod>${formatDate(latestUpdate)}</lastmod>
      <priority>0.65</priority>
    </url>`);
      }
    }

    for (const project of projects) {
      // Skip projects without a programme — they have no canonical URL under
      // the new scheme. (Should not happen in practice for published rows.)
      if (!project.program) continue;
      const projectPath = getStudentUrl({ ...project, program: project.program } as Project, locale);
      urls.push(`  <url>
      <loc>${siteUrl}${projectPath}</loc>
      <lastmod>${formatDate(project.updated_at)}</lastmod>
      <priority>0.8</priority>
    </url>`);
    }
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return c.text(sitemap, 200, { "Content-Type": "application/xml" });
});

app.get("/api/search", async (c) => {
  const rawQuery = c.req.query("query")?.trim() ?? "";
  const localeParam = c.req.query("locale");
  const locale: PublicLocale = isPublicLocale(localeParam) ? localeParam : DEFAULT_PUBLIC_LOCALE;
  const accept = c.req.header("accept") ?? "";
  const wantsHtml = accept.includes("text/html") || c.req.query("format") === "html";

  if (rawQuery.length < 2) {
    return c.json({ query: rawQuery, results: [] });
  }

  const site = c.var.site;
  const like = `%${escapeLikeValue(rawQuery)}%`;
  const programmePlaceholders = site.programmes.map(() => "?").join(",");

  // Search is scoped to the visiting site's programmes. On graduates this
  // covers all visible programmes (the umbrella view); on masters/fotografie
  // it restricts results to that domain's content.
  const conditions = [
    "status = 'published'",
    `program IN (${programmePlaceholders})`,
    "(student_name LIKE ? ESCAPE '\\' OR project_title_en LIKE ? ESCAPE '\\' OR project_title_nl LIKE ? ESCAPE '\\' OR description_en LIKE ? ESCAPE '\\' OR description_nl LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\')",
  ];
  const params: string[] = [...site.programmes, like, like, like, like, like, like];

  const { results } = await c.env.DB.prepare(
    `SELECT
       projects.*,
       (
         SELECT cloudflare_id
         FROM project_images
         WHERE project_images.project_id = projects.id
           AND project_images.type = 'web'
         ORDER BY sort_order ASC
         LIMIT 1
       ) AS main_image_id
     FROM projects
     WHERE ${conditions.join(" AND ")}
     ORDER BY sort_name
     LIMIT 60`
  )
    .bind(...params)
    .all<ProjectWithMainImage>();

  const localizedResults = results.map((project) => localizeProject(project, locale));

  if (wantsHtml) {
    const cardsHtml = renderToString(
      <>
        {localizedResults.map((project) => (
          <ProjectCard project={project} localePrefix={locale} showYear />
        ))}
      </>
    );
    return c.text(cardsHtml, 200, {
      "Content-Type": "text/html; charset=utf-8",
      "X-Results-Count": `${localizedResults.length}`,
    });
  }

  const resultsWithUrls = localizedResults.map((project) => {
    const imageId = project.thumb_image_id || project.main_image_id;
    return {
      slug: project.slug,
      student_name: project.student_name,
      project_title: project.project_title,
      academic_year: project.academic_year,
      context: project.context,
      url: getStudentUrl(project, locale),
      image_url: getImageUrl(imageId, "thumb") || null,
    };
  });

  return c.json({ query: rawQuery, results: resultsWithUrls });
});

// Filter that links to path-based context URLs under a programme listing.
// Used on /:locale/:year/:programme[/:context]/ pages — links go to
// /:locale/:year/:programme/        (all)
// /:locale/:year/:programme/:context (specific context)
//
// On the archive page it falls back to query-string filters (basePath ends in
// /archive) because archive composes year + context filters across multiple
// programmes; that path is intentionally untouched in this migration.
const ContextFilter = ({
  locale,
  basePath,
  activeContext,
  archiveYear,
  showLabel,
}: {
  locale: PublicLocale;
  basePath: string;
  activeContext: ContextKey | null;
  archiveYear?: string;
  showLabel?: boolean;
}) => {
  const text = TEXT[locale];
  const isArchive = basePath.endsWith("/archive");

  const allHref = isArchive
    ? archiveYear
      ? `${basePath}?year=${encodeURIComponent(archiveYear)}`
      : basePath
    : `${basePath}/`;

  return (
    <div class="filter-row">
      {showLabel && <span class="filter-label">{text.context}</span>}
      <nav class="context-nav">
        <a href={allHref} class={!activeContext ? "active" : ""}>
          {text.all}
        </a>
        {CONTEXT_KEYS.map((ctx) => {
          const label = getContextShortLabel(ctx, locale).toLowerCase();
          const href = isArchive
            ? archiveYear
              ? `${basePath}?year=${encodeURIComponent(archiveYear)}&context=${encodeURIComponent(ctx)}`
              : `${basePath}?context=${encodeURIComponent(ctx)}`
            : `${basePath}/${encodeURIComponent(ctx)}/`;
          return (
            <a href={href} class={activeContext === ctx ? "active" : ""}>
              {label}
            </a>
          );
        })}
      </nav>
    </div>
  );
};

app.get("/:locale/", async (c) => {
  const locale = c.req.param("locale");
  if (!isPublicLocale(locale)) {
    if (locale === "about") return c.redirect("/nl/about", 301);
    if (locale === "archive") return c.redirect("/nl/archive", 301);
    if (isAcademicYearSegment(locale)) return c.redirect(`/nl/${locale}/`, 301);
    return c.notFound();
  }

  const site = c.var.site;
  return renderListing(c, {
    locale,
    year: CURRENT_YEAR,
    title: CURRENT_YEAR,
    canonicalUrl: `${siteUrlFor(site)}/${locale}/`,
  });
});

app.get("/:locale", (c) => {
  const locale = c.req.param("locale");
  if (!isPublicLocale(locale)) {
    if (locale === "about") return c.redirect("/nl/about", 301);
    if (locale === "archive") return c.redirect("/nl/archive", 301);
    if (isAcademicYearSegment(locale)) return c.redirect(`/nl/${locale}/`, 301);
    return c.notFound();
  }
  return c.redirect(`/${locale}/`, 301);
});

app.get("/:locale/:year/", async (c) => {
  const locale = c.req.param("locale");
  if (!isPublicLocale(locale)) return c.notFound();

  const site = c.var.site;
  const year = c.req.param("year");
  const siteUrl = siteUrlFor(site);
  const canonicalUrl = year === CURRENT_YEAR ? `${siteUrl}/${locale}/` : `${siteUrl}/${locale}/${year}/`;
  return renderListing(c, {
    locale,
    year,
    title: year,
    canonicalUrl,
  });
});

// Note: the path-based programme listings (/:locale/:year/:programme[/:context]/)
// are registered LATER in this file, after the project detail route
// (/:locale/:year/students/:slug/), so the literal `students` segment wins
// over the generic `:programme` segment in Hono's matcher.

app.get("/:locale/about", (c) => {
  const locale = c.req.param("locale");
  if (!isPublicLocale(locale)) return c.notFound();

  setLocalePreference(c, locale);
  const text = TEXT[locale];
  const site = c.var.site;
  const canonicalUrl = `${siteUrlFor(site)}/${locale}/about`;
  const description =
    locale === "nl"
      ? "Lees meer over de afstudeerexpo Graduation Tour 2026 van Sint Lucas Antwerpen."
      : "Learn about the Graduation Tour 2026 exhibition at Sint Lucas Antwerpen.";

  const body =
    site.id === "fotografie" ? (
      <FotografieAboutBody locale={locale} />
    ) : site.id === "graduates" ? (
      <GraduatesAboutBody locale={locale} />
    ) : (
      <MastersAboutBody locale={locale} />
    );

  return c.html(
    <Layout
      site={site}
      locale={locale}
      currentPath={requestPathWithQuery(c)}
      title={text.aboutTitle}
      canonicalUrl={canonicalUrl}
      ogDescription={description}
      jsonLd={organizationSchemaFor(site)}
    >
      {body}
    </Layout>
  );
});

app.get("/:locale/archive", async (c) => {
  const locale = c.req.param("locale");
  if (!isPublicLocale(locale)) return c.notFound();

  setLocalePreference(c, locale);
  const text = TEXT[locale];
  const site = c.var.site;
  const year = c.req.query("year");
  const context = contextFromQuery(c.req.query("context"));
  const programmePlaceholders = site.programmes.map(() => "?").join(",");

  const { results: yearResults } = await c.env.DB.prepare(
    `SELECT DISTINCT academic_year FROM projects
       WHERE status = 'published'
         AND program IN (${programmePlaceholders})
       ORDER BY academic_year DESC`
  )
    .bind(...site.programmes)
    .all<{ academic_year: string }>();

  const years = yearResults.map((r) => r.academic_year);

  let query = `SELECT p.*,
    (
      SELECT cloudflare_id
      FROM project_images
      WHERE project_id = p.id AND type = 'web'
      ORDER BY sort_order ASC, id ASC
      LIMIT 1
    ) AS main_image_id
    FROM projects p`;
  const params: string[] = [];
  const conditions: string[] = ["p.status = 'published'", `p.program IN (${programmePlaceholders})`];
  params.push(...site.programmes);

  if (year) {
    conditions.push("p.academic_year = ?");
    params.push(year);
  }

  if (context) {
    conditions.push("p.context = ?");
    params.push(context);
  }

  query += " WHERE " + conditions.join(" AND ");
  query += " ORDER BY p.sort_name";

  const { results: projects } = await c.env.DB.prepare(query)
    .bind(...params)
    .all<ProjectWithMainImage>();

  const localizedProjects = projects.map((project) => localizeProject(project, locale));

  const { results: countResult } = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM projects
       WHERE status = 'published'
         AND program IN (${programmePlaceholders})`
  )
    .bind(...site.programmes)
    .all<{ count: number }>();
  const totalCount = countResult[0]?.count || 0;

  const yearRange = years.length > 1 ? `${years[years.length - 1]}-${years[0]}` : years[0] || "";
  const canonicalUrl = `${siteUrlFor(site)}/${locale}/archive`;
  const description = `${text.archiveDescriptionPrefix} ${totalCount} ${text.archiveDescriptionMiddle} ${yearRange}.`;

  return c.html(
    <Layout
      site={site}
      locale={locale}
      currentPath={requestPathWithQuery(c)}
      title={text.archive}
      canonicalUrl={canonicalUrl}
      ogDescription={description}
      jsonLd={organizationSchemaFor(site)}
    >
      <div class="archive-filters">
        <div class="filter-row">
          <span class="filter-label">{text.year}</span>
          <nav class="year-nav">
            <a
              href={`/${locale}/archive${context ? `?context=${encodeURIComponent(context)}` : ""}`}
              class={!year ? "active" : ""}
            >
              {text.all}
            </a>
            {years.map((y) => (
              <a
                href={`/${locale}/archive?year=${encodeURIComponent(y)}${context ? `&context=${encodeURIComponent(context)}` : ""}`}
                class={year === y ? "active" : ""}
              >
                {y}
              </a>
            ))}
          </nav>
        </div>
        <ContextFilter
          locale={locale}
          basePath={`/${locale}/archive`}
          activeContext={context}
          archiveYear={year || undefined}
          showLabel
        />
      </div>
      <div class="grid" data-project-grid data-show-year="true">
        {localizedProjects.map((project) => (
          <ProjectCard project={project} localePrefix={locale} showYear />
        ))}
      </div>
      {localizedProjects.length === 0 && <p class="empty-state">{text.noProjects}</p>}
    </Layout>
  );
});

// Legacy redirect: pre-programme project URLs (still produced by old links and
// by getStudentUrl for projects with NULL programme). Look up the project and
// 301 to the new programme-aware URL when possible. Registered BEFORE the
// programme detail route so the literal `students` segment at position 3 wins
// over /:locale/:year/:programme/:context/.
app.get("/:locale/:year/students/:slug/", async (c) => {
  const locale = c.req.param("locale");
  const year = c.req.param("year");
  const slug = c.req.param("slug");

  if (!isPublicLocale(locale)) {
    // Pre-locale legacy form: /YYYY-YYYY/students/slug/ — Hono parses
    // locale=YYYY-YYYY, year="students", slug=slug.
    if (year === "students" && isAcademicYearSegment(locale)) {
      return c.redirect(`/nl/${locale}/students/${slug}/`, 301);
    }
    return c.notFound();
  }

  const project = await c.env.DB.prepare(
    "SELECT slug, program FROM projects WHERE academic_year = ? AND slug = ? AND status = 'published'"
  )
    .bind(year, slug)
    .first<{ slug: string; program: string | null }>();

  if (!project) return c.notFound();
  if (!project.program || !(PROGRAMME_CODES as readonly string[]).includes(project.program)) {
    // Project has no programme — can't build the new URL. Treat as not found.
    return c.notFound();
  }

  const programmeSlug = programmeToSlug(project.program as ProgrammeCode);
  return c.redirect(`/${locale}/${year}/${programmeSlug}/students/${slug}/`, 301);
});

// /:locale/:year/:programme/students/:slug/ — canonical project detail URL.
app.get("/:locale/:year/:programme/students/:slug/", async (c) => {
  const locale = c.req.param("locale");
  if (!isPublicLocale(locale)) return c.notFound();

  const programmeSlugInUrl = c.req.param("programme");
  const programmeFromUrl = slugToProgramme(programmeSlugInUrl);
  if (!programmeFromUrl) return c.notFound();

  setLocalePreference(c, locale);
  const text = TEXT[locale];
  const site = c.var.site;
  const year = c.req.param("year");
  const slug = c.req.param("slug");

  const project = await c.env.DB.prepare(
    "SELECT * FROM projects WHERE academic_year = ? AND slug = ? AND status = 'published'"
  )
    .bind(year, slug)
    .first<Project>();

  if (!project) {
    return c.html(
      <Layout site={site} locale={locale} currentPath={requestPathWithQuery(c)} title={text.notFound}>
        <p>{text.studentNotFound}</p>
        <a href={`/${locale}/${CURRENT_YEAR}/`}>{text.back}</a>
      </Layout>,
      404
    );
  }

  // If the URL's programme segment doesn't match the project's actual
  // programme, 301 to the canonical programme path so search engines see one
  // canonical URL per project.
  if (project.program && project.program !== programmeFromUrl) {
    const correctSlug = programmeToSlug(project.program as ProgrammeCode);
    return c.redirect(`/${locale}/${year}/${correctSlug}/students/${slug}/`, 301);
  }

  const localizedProject = {
    ...project,
    project_title: getLocalizedProjectTitle(project, locale),
    bio: getLocalizedProjectBio(project, locale),
    description: getLocalizedProjectDescription(project, locale),
    location: getLocalizedProjectLocation(project, locale) || null,
  };

  const { results: allImages } = await c.env.DB.prepare(
    "SELECT * FROM project_images WHERE project_id = ? ORDER BY sort_order"
  )
    .bind(project.id)
    .all<ProjectImage>();

  const images = allImages.filter((img) => img.type !== "print");
  const socialLinks: string[] = project.social_links ? JSON.parse(project.social_links) : [];
  const tags: string[] = project.tags ? JSON.parse(project.tags) : [];
  const vtName = `student-${project.slug}`;

  type SocialKind = "instagram" | "youtube" | "linkedin" | "website";

  const parseSocialLink = (rawLink: string): { kind: SocialKind; label: string; href: string } => {
    const trimmed = rawLink.trim();
    if (!trimmed) return { kind: "website", label: "Website", href: rawLink };

    const parsedUrl = (() => {
      try {
        return new URL(trimmed);
      } catch {
        try {
          return new URL(`https://${trimmed}`);
        } catch {
          return null;
        }
      }
    })();

    if (!parsedUrl) {
      return { kind: "website", label: trimmed, href: rawLink };
    }

    const host = parsedUrl.hostname.replace(/^www\./, "");
    const lowerHost = host.toLowerCase();
    const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);

    if (lowerHost.includes("instagram.com") || lowerHost === "instagr.am") {
      const handle = pathSegments[0]?.replace(/^@/, "");
      return { kind: "instagram", label: handle ? handle : "Instagram", href: parsedUrl.toString() };
    }

    if (lowerHost.includes("youtube.com") || lowerHost.includes("youtu.be")) {
      let label = "YouTube";
      if (pathSegments[0]?.startsWith("@")) label = pathSegments[0];
      else if (pathSegments[0] === "user" && pathSegments[1]) label = pathSegments[1];
      else if (pathSegments[0] === "channel" && pathSegments[1]) label = pathSegments[1];
      else if (pathSegments[0] === "c" && pathSegments[1]) label = pathSegments[1];
      return { kind: "youtube", label, href: parsedUrl.toString() };
    }

    const isLinkedInShort = lowerHost === "lnkd.in";
    const isLinkedIn = lowerHost.endsWith("linkedin.com");
    if (isLinkedIn || isLinkedInShort) {
      return { kind: "linkedin", label: "LinkedIn", href: parsedUrl.toString() };
    }

    return { kind: "website", label: host, href: parsedUrl.toString() };
  };

  const socialItems = socialLinks.filter(Boolean).map(parseSocialLink);
  const locationLabel = localizedProject.location?.trim();
  const privateEmail = project.private_email?.trim();

  const renderSocialIcon = (kind: SocialKind) => {
    if (kind === "instagram") {
      return (
        <svg
          class="detail-link-svg"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="currentColor"
            d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm9 1.5h-9A4 4 0 0 0 3.5 7.5v9A4 4 0 0 0 7.5 20.5h9a4 4 0 0 0 4-4v-9a4 4 0 0 0-4-4z"
          />
          <path
            fill="currentColor"
            d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"
          />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      );
    }

    if (kind === "youtube") {
      return (
        <svg
          class="detail-link-svg"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="currentColor"
            d="M23.498 6.186a2.996 2.996 0 0 0-2.108-2.12C19.64 3.5 12 3.5 12 3.5s-7.64 0-9.39.566a2.996 2.996 0 0 0-2.108 2.12A31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .502 5.814 2.996 2.996 0 0 0 2.108 2.12C4.36 20.5 12 20.5 12 20.5s7.64 0 9.39-.566a2.996 2.996 0 0 0 2.108-2.12A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.502-5.814zM9.6 15.5V8.5L15.8 12l-6.2 3.5z"
          />
        </svg>
      );
    }

    if (kind === "linkedin") {
      return (
        <svg
          class="detail-link-svg"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="currentColor"
            d="M22.222 0H1.771C.792 0 0 .774 0 1.727v20.545C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.273V1.727C24 .774 23.2 0 22.222 0h.003zM7.068 20.452H3.557V9h3.511v11.452zM5.312 7.433a2.037 2.037 0 1 1 0-4.074 2.037 2.037 0 0 1 0 4.074zm15.14 13.019h-3.509v-5.569c0-1.328-.027-3.037-1.853-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.446V9h3.369v1.561h.047c.469-.9 1.614-1.85 3.323-1.85 3.555 0 4.207 2.368 4.207 5.455v6.286z"
          />
        </svg>
      );
    }

    return (
      <svg
        class="detail-link-svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    );
  };

  const renderMailIcon = () => (
    <svg
      class="detail-link-svg"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );

  // Canonical for a project lives on the *primary* site for its programme,
  // not whichever domain the visitor used. This avoids duplicate-content
  // penalties when the same project is reachable from all three sites.
  const canonicalSite =
    project.program && (PROGRAMME_CODES as readonly string[]).includes(project.program)
      ? primarySiteFor(project.program as ProgrammeCode)
      : site;
  const canonicalProgrammeSlug = programmeToSlug(programmeFromUrl);
  const canonicalUrl = `${siteUrlFor(canonicalSite)}/${locale}/${year}/${canonicalProgrammeSlug}/students/${slug}/`;
  const projectUrl = canonicalUrl;
  const backLinkHref = year === CURRENT_YEAR ? `/${locale}/` : `/${locale}/${year}/`;
  const mainImage = images[0] || null;
  const mainImageId = mainImage?.cloudflare_id;
  const mainImageAlt = mainImage?.caption || localizedProject.project_title;
  const mainImageUrl = mainImageId ? getImageUrl(mainImageId, "large") : null;
  const galleryImages = mainImageId ? images.slice(1) : images;
  const galleryImageUrls = images
    .map((img) => getImageUrl(img.cloudflare_id, "thumb"))
    .filter((url): url is string => Boolean(url));
  const imageUrls = [...(mainImageUrl ? [mainImageUrl] : []), ...galleryImageUrls];
  const creatorSameAs = socialItems.map((item) => item.href).filter(Boolean);
  // Meta line shown under the project title. Identical across all three
  // sites — only chrome differs by domain. MA_BK/PREMA_BK get
  // "Master/Premaster {Context}"; BA_FO/BA_BK get the programme label alone.
  const projectProgramme =
    project.program && (PROGRAMME_CODES as readonly string[]).includes(project.program)
      ? (project.program as ProgrammeCode)
      : null;
  const metaLabel = getProjectMetaLabel(projectProgramme, project.context, locale);

  const creativeWorkSchema = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${projectUrl}#creativework`,
    url: projectUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": projectUrl,
    },
    name: localizedProject.project_title,
    creator: {
      "@type": "Person",
      name: project.student_name,
      ...(creatorSameAs.length > 0 && { sameAs: creatorSameAs }),
    },
    description: localizedProject.description?.substring(0, 300) || "",
    ...(imageUrls.length > 0 && { image: imageUrls }),
    datePublished: project.created_at,
    dateModified: project.updated_at,
    ...(tags.length > 0 && { keywords: tags.join(", ") }),
  };

  const breadcrumbBaseUrl = siteUrlFor(canonicalSite);
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: text.home,
        item: `${breadcrumbBaseUrl}/${locale}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: year,
        item: `${breadcrumbBaseUrl}/${locale}/${year}/`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: project.student_name,
      },
    ],
  };

  return c.html(
    <Layout
      site={site}
      locale={locale}
      currentPath={requestPathWithQuery(c)}
      title={`${project.student_name} - ${localizedProject.project_title}`}
      ogImage={mainImageUrl}
      ogDescription={`${localizedProject.project_title} by ${project.student_name} · ${metaLabel}`}
      ogType="article"
      canonicalUrl={canonicalUrl}
      jsonLd={[organizationSchemaFor(canonicalSite), creativeWorkSchema, breadcrumbSchema]}
    >
      <article class="detail">
        <a href={backLinkHref} class="back-link">
          ← {text.back}
        </a>

        <header class="detail-header">
          <div class="detail-header-left">
            <h1 class="detail-project-title" style={`view-transition-name: title-${vtName}`}>
              {localizedProject.project_title}
            </h1>
            <p class="detail-meta">
              {metaLabel} · {project.academic_year}
            </p>
          </div>
          <div class="detail-header-right">
            <h2 class="detail-name" style={`view-transition-name: name-${vtName}`}>
              {project.student_name}
            </h2>
            {locationLabel && <p class="detail-location">{locationLabel}</p>}
            {(socialItems.length > 0 || privateEmail) && (
              <nav class="detail-links" aria-label={text.studentLinks}>
                {socialItems.map((item) => (
                  <a href={item.href} target="_blank" rel="noopener noreferrer">
                    <span class="detail-link-icon" aria-hidden="true">
                      {renderSocialIcon(item.kind)}
                    </span>
                    <span>{item.label}</span>
                  </a>
                ))}
                {privateEmail && (
                  <a href={`mailto:${privateEmail}`}>
                    <span class="detail-link-icon" aria-hidden="true">
                      {renderMailIcon()}
                    </span>
                    <span>{privateEmail}</span>
                  </a>
                )}
              </nav>
            )}
          </div>
        </header>

        {mainImageId && (
          <figure class="detail-hero">
            <img
              src={getImageUrl(mainImageId, "large")}
              data-lightbox-src={getImageUrl(mainImageId, "xl")}
              alt={mainImageAlt}
            />
          </figure>
        )}

        <div class="detail-content">
          {localizedProject.bio && (
            <section class="detail-section">
              <h2 class="detail-section-title">{text.detailAbout}</h2>
              <RichDescription text={localizedProject.bio} />
            </section>
          )}

          <section class="detail-section">
            <h2 class="detail-section-title">{text.detailProject}</h2>
            <RichDescription text={localizedProject.description} />
          </section>
        </div>

        {tags.length > 0 && (
          <div class="detail-tags">
            {tags.map((tag) => (
              <span class="tag">{tag}</span>
            ))}
          </div>
        )}

        {galleryImages.length > 0 && (
          <section class="detail-gallery">
            <div class="masonry">
              {galleryImages.map((img) => (
                <figure class="masonry-item">
                  <img
                    src={getImageUrl(img.cloudflare_id, "medium")}
                    data-lightbox-src={getImageUrl(img.cloudflare_id, "xl")}
                    alt={img.caption || localizedProject.project_title}
                    loading="lazy"
                  />
                  {img.caption && <figcaption>{img.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
        )}
        {images.length > 0 && <script src="/lightbox.js" defer></script>}
      </article>
    </Layout>
  );
});

// /:locale/:year/:programme/ — projects of a single programme.
// Programme URL slug ↔ DB code mapping lives in src/sites.ts. Registered
// AFTER /:locale/:year/students/:slug/ so the literal `students` segment
// wins in the matcher.
app.get("/:locale/:year/:programme/", async (c) => {
  const locale = c.req.param("locale");
  if (!isPublicLocale(locale)) {
    // The pattern /:locale/:year/:programme/ also matches the *legacy*
    // pre-locale URL /YYYY-YYYY/students/slug/. Hono's per-pattern dispatch
    // means the bare-year legacy redirect at the bottom of the file can't
    // claim those URLs first — handle them here.
    const year = c.req.param("year");
    const programmeSlug = c.req.param("programme");
    if (isAcademicYearSegment(locale) && year === "students") {
      return c.redirect(`/nl/${locale}/students/${programmeSlug}/`, 301);
    }
    return c.notFound();
  }

  const year = c.req.param("year");
  const programmeSlug = c.req.param("programme");
  const programme = slugToProgramme(programmeSlug);
  if (!programme) return c.notFound();

  // Canonical for a programme listing always lives on the programme's primary
  // site (masters for MA_BK/PREMA_BK, fotografie for BA_FO).
  const canonicalSite = primarySiteFor(programme);
  const canonicalUrl = `${siteUrlFor(canonicalSite)}/${locale}/${year}/${programmeSlug}/`;

  return renderListing(c, {
    locale,
    year,
    programme,
    title: `${programmeSlug.toUpperCase()} ${year}`,
    canonicalUrl,
  });
});

// /:locale/:year/:programme/:context/ — programme + context (MA_BK/PREMA_BK only).
app.get("/:locale/:year/:programme/:context/", async (c) => {
  const locale = c.req.param("locale");
  if (!isPublicLocale(locale)) return c.notFound();

  const year = c.req.param("year");
  const programmeSlug = c.req.param("programme");
  const programme = slugToProgramme(programmeSlug);
  if (!programme) return c.notFound();
  if (!PROGRAMMES_WITH_CONTEXT.has(programme)) return c.notFound();

  const contextRaw = c.req.param("context");
  const context = CONTEXT_KEYS.includes(contextRaw as ContextKey) ? (contextRaw as ContextKey) : null;
  if (!context) return c.notFound();

  const canonicalSite = primarySiteFor(programme);
  const canonicalUrl = `${siteUrlFor(canonicalSite)}/${locale}/${year}/${programmeSlug}/${context}/`;

  return renderListing(c, {
    locale,
    year,
    programme,
    context,
    title: `${getContextFullLabel(context, locale)} ${year}`,
    canonicalUrl,
  });
});

// Legacy redirects to default locale
app.get("/", (c) => c.redirect("/nl/", 301));
app.get("/about", (c) => c.redirect("/nl/about", 301));
app.get("/archive", (c) => c.redirect("/nl/archive", 301));
app.get("/:year/", (c) => c.redirect(`/nl/${c.req.param("year")}/`, 301));
app.get("/:year/students/:slug/", (c) =>
  c.redirect(`/nl/${c.req.param("year")}/students/${c.req.param("slug")}/`, 301)
);

// Catch-all 404
app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "Not found" }, 404);
  }
  const locale = c.req.path.startsWith("/nl") ? "nl" : "en";
  const text = TEXT[locale];
  // siteMiddleware runs before notFound for public paths; fall back to
  // resolveSite from the request host for safety on unmounted prefixes.
  const site = c.get("site") ?? resolveSite(c.req.header("host"));
  return c.html(
    <Layout site={site} locale={locale} currentPath={c.req.path} title={text.notFound}>
      <div class="not-found-page">
        <h1>404</h1>
        <p>{text.pageNotFound}</p>
        <a href={`/${locale}/`} class="not-found-link">
          {text.returnToHomepage}
        </a>
      </div>
    </Layout>,
    404
  );
});

const scheduled: ExportedHandlerScheduledHandler<Bindings> = async (_event, env, ctx) => {
  ctx.waitUntil(
    env.DB.prepare(
      `DELETE FROM auth_tokens
       WHERE used_at IS NOT NULL
          OR expires_at <= datetime('now')`
    ).run()
  );
};

export default Sentry.withSentry(
  (env: Bindings) => ({
    dsn: env.SENTRY_DSN,
    release: env.CF_VERSION_METADATA?.id,
    sendDefaultPii: false,
    tracesSampleRate: 1.0,
  }),
  { fetch: app.fetch, scheduled }
);
