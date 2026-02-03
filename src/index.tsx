import { Hono } from "hono";
import { Layout } from "./components/Layout";
import { ProjectCard } from "./components/ProjectCard";
import { RichDescription } from "./lib/video-embed";
import type { Bindings, Project, ProjectImage } from "./types";
import { CONTEXTS, getImageUrl, getStudentUrl } from "./types";
import { CURRENT_YEAR } from "./config";
import { authApiRoutes, authPageRoutes } from "./routes/auth";
import { adminPageRoutes } from "./routes/admin";
import { adminApiRoutes } from "./routes/admin-api";

const app = new Hono<{ Bindings: Bindings }>();

// Auth routes
app.route("/api/auth", authApiRoutes);
app.route("/auth", authPageRoutes);
app.route("/api/admin", adminApiRoutes);
app.route("/admin", adminPageRoutes);

const SITE_URL = "https://sintlucasmasters.com";

// Base organization schema for all pages
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Sint Lucas Antwerpen",
  url: SITE_URL,
};

// robots.txt
app.get("/robots.txt", (c) => {
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /auth
Sitemap: ${SITE_URL}/sitemap.xml
`;
  return c.text(robotsTxt, 200, { "Content-Type": "text/plain" });
});

// sitemap.xml
app.get("/sitemap.xml", async (c) => {
  // Get all published projects with their updated_at timestamps
  const { results: projects } = await c.env.DB.prepare(
    "SELECT academic_year, slug, updated_at FROM projects WHERE status = 'published' ORDER BY academic_year DESC, sort_name"
  ).all<{ academic_year: string; slug: string; updated_at: string | null }>();

  // Get distinct years
  const years = [...new Set(projects.map((p) => p.academic_year))];

  // Helper to format date for sitemap (YYYY-MM-DD)
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return new Date().toISOString().split("T")[0];
    return dateStr.split("T")[0];
  };

  const today = new Date().toISOString().split("T")[0];

  const urls: string[] = [];

  // Static pages
  urls.push(`  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <priority>1.0</priority>
  </url>`);

  urls.push(`  <url>
    <loc>${SITE_URL}/about</loc>
    <lastmod>${today}</lastmod>
    <priority>0.5</priority>
  </url>`);

  urls.push(`  <url>
    <loc>${SITE_URL}/archive</loc>
    <lastmod>${today}</lastmod>
    <priority>0.6</priority>
  </url>`);

  // Year pages
  for (const year of years) {
    const yearProjects = projects.filter((p) => p.academic_year === year);
    const latestUpdate = yearProjects.reduce((latest, p) => {
      const pDate = p.updated_at || "";
      return pDate > latest ? pDate : latest;
    }, "");

    urls.push(`  <url>
    <loc>${SITE_URL}/${year}/</loc>
    <lastmod>${formatDate(latestUpdate)}</lastmod>
    <priority>0.7</priority>
  </url>`);
  }

  // Project pages
  for (const project of projects) {
    urls.push(`  <url>
    <loc>${SITE_URL}/${project.academic_year}/students/${project.slug}/</loc>
    <lastmod>${formatDate(project.updated_at)}</lastmod>
    <priority>0.8</priority>
  </url>`);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return c.text(sitemap, 200, { "Content-Type": "application/xml" });
});

// Home page - redirect to current year
app.get("/", (c) => {
  return c.redirect(`/${CURRENT_YEAR}/`);
});

// Context filter nav component
const ContextFilter = ({
  basePath,
  activeContext,
  queryPrefix,
  showLabel,
}: {
  basePath: string;
  activeContext: string | undefined;
  queryPrefix?: string;
  showLabel?: boolean;
}) => (
  <div class="filter-row">
    {showLabel && <span class="filter-label">Context</span>}
    <nav class="context-nav">
      <a href={`${basePath}${queryPrefix || ""}`} class={!activeContext ? "active" : ""}>
        all
      </a>
      {CONTEXTS.map((ctx) => {
        const label = ctx.replace(" Context", "").toLowerCase();
        const href = queryPrefix
          ? `${basePath}${queryPrefix}&context=${encodeURIComponent(ctx)}`
          : `${basePath}?context=${encodeURIComponent(ctx)}`;
        return (
          <a href={href} class={activeContext === ctx ? "active" : ""}>
            {label}
          </a>
        );
      })}
    </nav>
  </div>
);

// Year page - projects for a specific academic year
app.get("/:year/", async (c) => {
  const year = c.req.param("year");
  const context = c.req.query("context");

  let query = "SELECT * FROM projects WHERE academic_year = ? AND status = 'published'";
  const params: string[] = [year];

  if (context && CONTEXTS.includes(context as any)) {
    query += " AND context = ?";
    params.push(context);
  }

  query += " ORDER BY sort_name";

  const { results: projects } = await c.env.DB.prepare(query)
    .bind(...params)
    .all<Project>();

  // If no projects found for this year, show 404
  if (projects.length === 0 && !context) {
    return c.html(
      <Layout title="Not Found">
        <p>No projects found for {year}.</p>
        <a href={`/${CURRENT_YEAR}/`}>Go to current year</a>
      </Layout>,
      404
    );
  }

  const basePath = `/${year}/`;
  const canonicalUrl = `${SITE_URL}/${year}/`;
  const description = `Discover ${projects.length} graduation projects from Sint Lucas Masters ${year}. Explore works across Autonomous, Applied, Digital, Socio-Political, and Jewelry contexts.`;

  return c.html(
    <Layout title={year} canonicalUrl={canonicalUrl} ogDescription={description} jsonLd={organizationSchema}>
      <div class="page-filters">
        <ContextFilter basePath={basePath} activeContext={context} showLabel />
      </div>
      <div class="grid">
        {projects.map((project) => (
          <ProjectCard project={project} />
        ))}
      </div>
      {projects.length === 0 && <p class="empty-state">No projects found for this context.</p>}
    </Layout>
  );
});

// About page
app.get("/about", (c) => {
  const canonicalUrl = `${SITE_URL}/about`;
  const description =
    "Learn about the Sint Lucas Masters Graduation Tour exhibition showcasing master-level art and design projects from Antwerp.";

  return c.html(
    <Layout title="About" canonicalUrl={canonicalUrl} ogDescription={description} jsonLd={organizationSchema}>
      <div class="about-content">
        <h2 class="about-heading">Master Expo</h2>
        <p class="about-text">
          Discover the new generation of artists, designers and photographers of{" "}
          <a href="https://www.sintlucasantwerpen.be/" target="_blank" rel="noopener noreferrer">
            Sint Lucas Antwerpen
          </a>
          .
        </p>
        <h3>Credits</h3>
        <dl class="credits-list">
          <div class="credits-entry">
            <dt>Head of the Master</dt>
            <dd>Reg Herygers</dd>
          </div>
          <div class="credits-entry">
            <dt>Communication</dt>
            <dd>Nicolas Van Herck</dd>
          </div>
          <div class="credits-entry">
            <dt>Development</dt>
            <dd>Frederik De Bleser</dd>
          </div>
          <div class="credits-entry">
            <dt>Design</dt>
            <dd>Chloé D'Hauwe</dd>
          </div>
        </dl>
        <p class="credits-source">
          The code for this website is free software, available on{" "}
          <a href="https://github.com/fdb/sintlucasmasters/" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          .
        </p>
      </div>
    </Layout>
  );
});

// Archive page - all years
app.get("/archive", async (c) => {
  const year = c.req.query("year");
  const context = c.req.query("context");

  // Get available years (only years with published projects)
  const { results: yearResults } = await c.env.DB.prepare(
    "SELECT DISTINCT academic_year FROM projects WHERE status = 'published' ORDER BY academic_year DESC"
  ).all<{ academic_year: string }>();

  const years = yearResults.map((r) => r.academic_year);
  const selectedYear = year;

  let query = "SELECT * FROM projects";
  const params: string[] = [];
  const conditions: string[] = ["status = 'published'"];

  if (selectedYear) {
    conditions.push("academic_year = ?");
    params.push(selectedYear);
  }

  if (context && CONTEXTS.includes(context as any)) {
    conditions.push("context = ?");
    params.push(context);
  }

  query += " WHERE " + conditions.join(" AND ");
  query += " ORDER BY sort_name";

  const { results: projects } = await c.env.DB.prepare(query)
    .bind(...params)
    .all<Project>();

  // Get total count for all projects
  const { results: countResult } = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM projects WHERE status = 'published'"
  ).all<{ count: number }>();
  const totalCount = countResult[0]?.count || 0;

  const yearRange = years.length > 1 ? `${years[years.length - 1]}–${years[0]}` : years[0] || "";
  const canonicalUrl = `${SITE_URL}/archive`;
  const description = `Browse ${totalCount} master thesis projects from Sint Lucas Antwerpen spanning ${yearRange}.`;

  return c.html(
    <Layout title="Archive" canonicalUrl={canonicalUrl} ogDescription={description} jsonLd={organizationSchema}>
      <div class="archive-filters">
        <div class="filter-row">
          <span class="filter-label">Year</span>
          <nav class="year-nav">
            <a
              href={`/archive${context ? `?context=${encodeURIComponent(context)}` : ""}`}
              class={!selectedYear ? "active" : ""}
            >
              all
            </a>
            {years.map((y) => (
              <a
                href={`/archive?year=${encodeURIComponent(y)}${context ? `&context=${encodeURIComponent(context)}` : ""}`}
                class={selectedYear === y ? "active" : ""}
              >
                {y}
              </a>
            ))}
          </nav>
        </div>
        <ContextFilter
          basePath={`/archive`}
          activeContext={context}
          queryPrefix={selectedYear ? `?year=${encodeURIComponent(selectedYear)}&` : "?"}
          showLabel
        />
      </div>
      <div class="grid">
        {projects.map((project) => (
          <ProjectCard project={project} showYear />
        ))}
      </div>
      {projects.length === 0 && <p class="empty-state">No projects found.</p>}
    </Layout>
  );
});

// Student detail page
app.get("/:year/students/:slug/", async (c) => {
  const year = c.req.param("year");
  const slug = c.req.param("slug");

  const project = await c.env.DB.prepare(
    "SELECT * FROM projects WHERE academic_year = ? AND slug = ? AND status = 'published'"
  )
    .bind(year, slug)
    .first<Project>();

  if (!project) {
    return c.html(
      <Layout title="Not Found">
        <p>Student not found.</p>
        <a href={`/${CURRENT_YEAR}/`}>Back to projects</a>
      </Layout>,
      404
    );
  }

  const { results: allImages } = await c.env.DB.prepare(
    "SELECT * FROM project_images WHERE project_id = ? ORDER BY sort_order"
  )
    .bind(project.id)
    .all<ProjectImage>();

  const images = allImages.filter((img) => img.type !== "print");
  const socialLinks: string[] = project.social_links ? JSON.parse(project.social_links) : [];
  const tags: string[] = project.tags ? JSON.parse(project.tags) : [];
  const vtName = `student-${project.slug}`;

  type SocialKind = "instagram" | "youtube" | "website";

  const parseSocialLink = (rawLink: string): { kind: SocialKind; label: string; href: string } => {
    const trimmed = rawLink.trim();
    if (!trimmed) {
      return { kind: "website", label: "Website", href: rawLink };
    }

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
      return {
        kind: "instagram",
        label: handle ? handle : "Instagram",
        href: parsedUrl.toString(),
      };
    }

    if (lowerHost.includes("youtube.com") || lowerHost.includes("youtu.be")) {
      let label = "YouTube";
      if (pathSegments[0]?.startsWith("@")) {
        label = pathSegments[0];
      } else if (pathSegments[0] === "user" && pathSegments[1]) {
        label = pathSegments[1];
      } else if (pathSegments[0] === "channel" && pathSegments[1]) {
        label = pathSegments[1];
      } else if (pathSegments[0] === "c" && pathSegments[1]) {
        label = pathSegments[1];
      }
      return { kind: "youtube", label, href: parsedUrl.toString() };
    }

    return { kind: "website", label: host, href: parsedUrl.toString() };
  };

  const socialItems = socialLinks.filter(Boolean).map(parseSocialLink);

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

  const canonicalUrl = `${SITE_URL}/${year}/students/${slug}/`;
  const mainImageUrl = project.main_image_id ? getImageUrl(project.main_image_id, "large") : null;

  // JSON-LD structured data for project pages
  const creativeWorkSchema = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.project_title,
    creator: {
      "@type": "Person",
      name: project.student_name,
    },
    description: project.description?.substring(0, 300) || "",
    ...(mainImageUrl && { image: mainImageUrl }),
    dateCreated: project.academic_year,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: year,
        item: `${SITE_URL}/${year}/`,
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
      title={`${project.student_name} — ${project.project_title}`}
      ogImage={mainImageUrl}
      ogDescription={`${project.project_title} by ${project.student_name} · ${project.context}`}
      canonicalUrl={canonicalUrl}
      jsonLd={[organizationSchema, creativeWorkSchema, breadcrumbSchema]}
    >
      <article class="detail">
        <a href={`/${year}/`} class="back-link">
          ← Back
        </a>

        <header class="detail-header">
          <div class="detail-header-left">
            <h1 class="detail-project-title" style={`view-transition-name: title-${vtName}`}>
              {project.project_title}
            </h1>
            <p class="detail-meta">
              {project.context} · {project.academic_year}
            </p>
          </div>
          <div class="detail-header-right">
            <h2 class="detail-name" style={`view-transition-name: name-${vtName}`}>
              {project.student_name}
            </h2>
            {socialItems.length > 0 && (
              <nav class="detail-links" aria-label="Student links">
                {socialItems.map((item) => (
                  <a href={item.href} target="_blank" rel="noopener noreferrer">
                    <span class="detail-link-icon" aria-hidden="true">
                      {renderSocialIcon(item.kind)}
                    </span>
                    <span>{item.label}</span>
                  </a>
                ))}
              </nav>
            )}
          </div>
        </header>

        {project.main_image_id && (
          <figure class="detail-hero">
            <img src={getImageUrl(project.main_image_id, "large")} alt={project.project_title} />
          </figure>
        )}

        <div class="detail-content">
          {project.bio && (
            <section class="detail-section">
              <h2 class="detail-section-title">About</h2>
              <RichDescription text={project.bio} />
            </section>
          )}

          <section class="detail-section">
            <h2 class="detail-section-title">Project</h2>
            <RichDescription text={project.description} />
          </section>
        </div>

        {tags.length > 0 && (
          <div class="detail-tags">
            {tags.map((tag) => (
              <span class="tag">{tag}</span>
            ))}
          </div>
        )}

        {images.length > 0 && (
          <section class="detail-gallery">
            <div class="masonry">
              {images.map((img) => (
                <figure class="masonry-item">
                  <img
                    src={getImageUrl(img.cloudflare_id, "medium")}
                    data-lightbox-src={getImageUrl(img.cloudflare_id, "xl")}
                    alt={img.caption || project.project_title}
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

// Scheduled handler for cron jobs (token cleanup)
const scheduled: ExportedHandlerScheduledHandler<Bindings> = async (event, env, ctx) => {
  ctx.waitUntil(
    env.DB.prepare(
      `DELETE FROM auth_tokens
       WHERE used_at IS NOT NULL
          OR expires_at <= datetime('now')`
    ).run()
  );
};

export default {
  fetch: app.fetch,
  scheduled,
};
