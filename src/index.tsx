import { Hono } from "hono";
import { Layout } from "./components/Layout";
import { ProjectCard } from "./components/ProjectCard";
import type { Bindings, Project, ProjectImage } from "./types";
import { CONTEXTS, getImageUrl } from "./types";
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

// Year page - projects for a specific academic year
app.get("/:year/", async (c) => {
  const year = c.req.param("year");
  const context = c.req.query("context");

  let query = "SELECT * FROM projects WHERE academic_year = ?";
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
  const contextLabel = context ? context.replace(" Context", " context") : null;

  return c.html(
    <Layout
      title={contextLabel ? `${contextLabel} - ${year}` : year}
      ogDescription={`${projects.length} master projects from Sint Lucas Antwerpen ${year}${contextLabel ? ` · ${contextLabel}` : ""}`}
    >
      <h1 class="page-title">Masters {year}</h1>
      <p class="page-subtitle">{contextLabel || "All contexts"}</p>
      <nav class="filter-nav filter-nav--single">
        <div class="filter-nav-row">
          <span class="filter-nav-label">Context</span>
          <a href={basePath} class={!context ? "active" : ""}>
            All
          </a>
          {CONTEXTS.map((ctx) => (
            <a href={`${basePath}?context=${encodeURIComponent(ctx)}`} class={context === ctx ? "active" : ""}>
              {ctx.replace(" Context", "")}
            </a>
          ))}
        </div>
      </nav>
      <div class="grid">
        {projects.map((project) => (
          <ProjectCard project={project} />
        ))}
      </div>
      {projects.length === 0 && <p class="empty-state">No projects found.</p>}
    </Layout>
  );
});

// About page
app.get("/about", (c) => {
  return c.html(
    <Layout title="About">
      <h2>Master Expo</h2>
      <p class="intro">
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
    </Layout>
  );
});

// Archive page - all years
app.get("/archive", async (c) => {
  const year = c.req.query("year");
  const context = c.req.query("context");

  // Get available years
  const { results: yearResults } = await c.env.DB.prepare(
    "SELECT DISTINCT academic_year FROM projects ORDER BY academic_year DESC"
  ).all<{ academic_year: string }>();

  const years = yearResults.map((r) => r.academic_year);
  const selectedYear = year; // undefined means "all years"

  let query = "SELECT * FROM projects";
  const params: string[] = [];
  const conditions: string[] = [];

  if (selectedYear) {
    conditions.push("academic_year = ?");
    params.push(selectedYear);
  }

  if (context && CONTEXTS.includes(context as any)) {
    conditions.push("context = ?");
    params.push(context);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY sort_name";

  const { results: projects } = await c.env.DB.prepare(query)
    .bind(...params)
    .all<Project>();

  const archiveDescription = selectedYear
    ? `${projects.length} master projects from Sint Lucas Antwerpen ${selectedYear}`
    : `Browse ${projects.length} master projects from Sint Lucas Antwerpen across all years`;

  const contextLabel = context ? context.replace(" Context", "") : null;

  return c.html(
    <Layout title={`Archive${selectedYear ? ` - ${selectedYear}` : ""}`} ogDescription={archiveDescription}>
      <h1 class="page-title">
        Archive · {selectedYear || "All years"}
        {contextLabel ? ` · ${contextLabel}` : ""}
      </h1>
      <nav class="filter-nav">
        <div class="filter-nav-row">
          <span class="filter-nav-label">Year</span>
          <a
            href={`/archive${context ? `?context=${encodeURIComponent(context)}` : ""}`}
            class={!selectedYear ? "active" : ""}
          >
            All
          </a>
          {years.map((y) => (
            <a
              href={`/archive?year=${encodeURIComponent(y)}${context ? `&context=${encodeURIComponent(context)}` : ""}`}
              class={selectedYear === y ? "active" : ""}
            >
              {y}
            </a>
          ))}
        </div>
        <div class="filter-nav-row">
          <span class="filter-nav-label">Context</span>
          <a
            href={`/archive${selectedYear ? `?year=${encodeURIComponent(selectedYear)}` : ""}`}
            class={!context ? "active" : ""}
          >
            All
          </a>
          {CONTEXTS.map((ctx) => (
            <a
              href={`/archive?${selectedYear ? `year=${encodeURIComponent(selectedYear)}&` : ""}context=${encodeURIComponent(ctx)}`}
              class={context === ctx ? "active" : ""}
            >
              {ctx.replace(" Context", "")}
            </a>
          ))}
        </div>
      </nav>
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

  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE academic_year = ? AND slug = ?")
    .bind(year, slug)
    .first<Project>();

  if (!project) {
    return c.html(
      <Layout title="Not Found">
        <p>Student not found.</p>
        <a href={`/${CURRENT_YEAR}/`}>Back to home</a>
      </Layout>,
      404
    );
  }

  const { results: images } = await c.env.DB.prepare(
    "SELECT * FROM project_images WHERE project_id = ? ORDER BY sort_order"
  )
    .bind(project.id)
    .all<ProjectImage>();

  const socialLinks: string[] = project.social_links ? JSON.parse(project.social_links) : [];
  const tags: string[] = project.tags ? JSON.parse(project.tags) : [];

  return c.html(
    <Layout
      title={`${project.student_name} - ${project.project_title}`}
      ogImage={getImageUrl(project.main_image_id, "large")}
      ogDescription={`${project.project_title} by ${project.student_name} · ${project.context}`}
    >
      <a href={`/${year}/`} class="back-link">
        ← Back to {year}
      </a>
      <div class="project-detail">
        <h1>{project.student_name}</h1>
        <p class="meta">
          {project.project_title} · {project.context} · {project.academic_year}
        </p>
        {project.main_image_id && (
          <img src={getImageUrl(project.main_image_id, "large")} alt={project.project_title} class="main-image" />
        )}
        {project.bio && (
          <div>
            <h3>Bio</h3>
            <p class="description">{project.bio}</p>
          </div>
        )}
        <div>
          <h3>About the project</h3>
          <p class="description">{project.description}</p>
        </div>
        {tags.length > 0 && (
          <div>
            <h3>Tags</h3>
            <div class="tags">
              {tags.map((tag) => (
                <span class="tag">{tag}</span>
              ))}
            </div>
          </div>
        )}
        {images.length > 0 && (
          <div>
            <h3>Gallery</h3>
            <div class="gallery">
              {images.map((img) => (
                <img
                  src={getImageUrl(img.cloudflare_id, "medium")}
                  data-lightbox-src={getImageUrl(img.cloudflare_id, "xl")}
                  alt={img.caption || project.project_title}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        )}
        {images.length > 0 && <script src="/lightbox.js" defer></script>}
        {socialLinks.length > 0 && (
          <div>
            <h3>Links</h3>
            <div class="links">
              {socialLinks.map((link) => (
                <a href={link} target="_blank" rel="noopener noreferrer">
                  {new URL(link).hostname}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
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
