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

  return c.html(
    <Layout title={year}>
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
  return c.html(
    <Layout title="About">
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
        <p>
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

  return c.html(
    <Layout title="Archive">
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

  return c.html(
    <Layout
      title={`${project.student_name} — ${project.project_title}`}
      ogImage={getImageUrl(project.main_image_id, "large")}
      ogDescription={`${project.project_title} by ${project.student_name} · ${project.context}`}
    >
      <article class="detail">
        <a href={`/${year}/`} class="back-link">
          ← Back
        </a>

        <header class="detail-header">
          <h1 class="detail-name" style={`view-transition-name: name-${vtName}`}>
            {project.student_name}
          </h1>
          <p class="detail-project-title" style={`view-transition-name: title-${vtName}`}>
            {project.project_title}
          </p>
          <p class="detail-meta">
            {project.context} · {project.academic_year}
          </p>
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

        {socialLinks.length > 0 && (
          <section class="detail-links">
            {socialLinks.map((link) => (
              <a href={link} target="_blank" rel="noopener noreferrer">
                {new URL(link).hostname.replace("www.", "")}
              </a>
            ))}
          </section>
        )}
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
