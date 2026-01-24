import { Hono } from "hono";
import type { Bindings, Project, ProjectImage, User } from "../../types";
import { CONTEXTS, getImageUrl, getStudentUrl } from "../../types";
import { authMiddleware, requireAdmin, type AuthUser } from "../../middleware/auth";
import { AdminLayout } from "../../components/admin/Layout";
import { AdminTabs } from "../../components/admin/Tabs";

// Status options for projects
const STATUSES = ["draft", "submitted", "ready_for_print", "published"] as const;
const PROGRAMS = ["Fine Arts", "Photography"] as const;

// Helper to format dates
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Helper to get status class
function getStatusClass(status: string): string {
  return `status-${status.replace(/_/g, "_")}`;
}

// Helper to format status label
function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export const adminRoutes = new Hono<{
  Bindings: Bindings;
  Variables: { user: AuthUser };
}>();

// Apply auth middleware to all admin routes
adminRoutes.use("*", authMiddleware, requireAdmin);

// Projects list page
adminRoutes.get("/", async (c) => {
  const user = c.get("user");
  const yearFilter = c.req.query("year");
  const statusFilter = c.req.query("status");
  const search = c.req.query("q");

  // Build query
  let query = "SELECT * FROM projects";
  const params: string[] = [];
  const conditions: string[] = [];

  if (yearFilter) {
    conditions.push("academic_year = ?");
    params.push(yearFilter);
  }

  if (statusFilter) {
    conditions.push("status = ?");
    params.push(statusFilter);
  }

  if (search) {
    conditions.push("(student_name LIKE ? OR project_title LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY updated_at DESC";

  const { results: projects } = await c.env.DB.prepare(query)
    .bind(...params)
    .all<Project>();

  // Get available years for filter
  const { results: yearResults } = await c.env.DB.prepare(
    "SELECT DISTINCT academic_year FROM projects ORDER BY academic_year DESC"
  ).all<{ academic_year: string }>();

  const years = yearResults.map((r) => r.academic_year);

  // Get total count
  const countResult = await c.env.DB.prepare("SELECT COUNT(*) as count FROM projects").first<{ count: number }>();
  const totalCount = countResult?.count ?? 0;

  return c.html(
    <AdminLayout title="Projects" user={user}>
      <div class="admin-panel">
        <AdminTabs activeTab="projects" />
        <div class="admin-list">
          <div class="admin-list-header">
            <h2>Projects</h2>
            <div class="admin-filters">
              <form method="get" action="/admin" class="search-container">
                <input
                  type="text"
                  name="q"
                  placeholder="Search..."
                  value={search || ""}
                  class="search-input"
                  style="width: 140px;"
                />
                {yearFilter && <input type="hidden" name="year" value={yearFilter} />}
                {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
              </form>
              <select
                name="year"
                class="filter-select"
                onchange="window.location.href='/admin?' + new URLSearchParams({...Object.fromEntries(new URLSearchParams(window.location.search)), year: this.value}).toString()"
              >
                <option value="">All years</option>
                {years.map((y) => (
                  <option value={y} selected={yearFilter === y}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                name="status"
                class="filter-select"
                onchange="window.location.href='/admin?' + new URLSearchParams({...Object.fromEntries(new URLSearchParams(window.location.search)), status: this.value}).toString()"
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option value={s} selected={statusFilter === s}>
                    {formatStatus(s)}
                  </option>
                ))}
              </select>
              <span class="filter-count">
                {projects.length} / {totalCount}
              </span>
            </div>
          </div>
          <div class="admin-list-scroll">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Project</th>
                  <th>Context</th>
                  <th>Year</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr
                    class={`row-clickable ${getStatusClass(project.status)}`}
                    onclick={`window.location.href='/admin/projects/${project.id}'`}
                  >
                    <td>{project.student_name}</td>
                    <td>{project.project_title}</td>
                    <td>{project.context.replace(" Context", "")}</td>
                    <td>{project.academic_year}</td>
                    <td>
                      <span class={`status-badge ${getStatusClass(project.status)}`}>
                        {formatStatus(project.status)}
                      </span>
                    </td>
                    <td>{formatDate(project.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {projects.length === 0 && <div class="admin-list-message">No projects found.</div>}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
});

// Project detail page
adminRoutes.get("/projects/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first<Project>();

  if (!project) {
    return c.html(
      <AdminLayout title="Not Found" user={user}>
        <div class="admin-panel">
          <AdminTabs activeTab="projects" />
          <div class="admin-detail-empty">
            <span class="detail-icon">?</span>
            <span>Project not found</span>
            <a href="/admin">Back to projects</a>
          </div>
        </div>
      </AdminLayout>,
      404
    );
  }

  const { results: images } = await c.env.DB.prepare(
    "SELECT * FROM project_images WHERE project_id = ? ORDER BY sort_order ASC, id ASC"
  )
    .bind(id)
    .all<ProjectImage>();

  const socialLinks: string[] = project.social_links ? JSON.parse(project.social_links) : [];
  const tags: string[] = project.tags ? JSON.parse(project.tags) : [];

  return c.html(
    <AdminLayout title={project.student_name} user={user}>
      <div class="admin-panel">
        <AdminTabs activeTab="projects" />
        <div class="admin-split">
          {/* Left side - back link and navigation */}
          <div class="admin-list">
            <div class="admin-list-header">
              <a href="/admin" style="text-decoration: none; color: inherit;">
                <h2>&larr; Back to list</h2>
              </a>
            </div>
          </div>
          {/* Right side - project detail */}
          <div class="admin-detail-panel">
            <div class="admin-detail-content">
              <div class="detail-header-row">
                <h3>{project.student_name}</h3>
                <div class="detail-header-actions">
                  <span class={`status-badge ${getStatusClass(project.status)}`}>{formatStatus(project.status)}</span>
                  <div class="detail-action-group">
                    <a href={`/admin/projects/${project.id}/edit`} class="detail-action-btn has-label">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Edit
                    </a>
                    <a href={getStudentUrl(project)} target="_blank" rel="noopener" class="detail-action-btn">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
              <p class="detail-title">{project.project_title}</p>
              <p class="detail-program-context">
                <span class="detail-program">{project.context.replace(" Context", "")}</span>
                {" · "}
                <span class="detail-context">{project.context}</span>
              </p>
              <p class="detail-year">{project.academic_year}</p>

              {project.bio && (
                <div class="detail-section">
                  <div class="detail-section-label">Bio</div>
                  <div class="detail-text">{project.bio}</div>
                </div>
              )}

              {project.description && (
                <div class="detail-section">
                  <div class="detail-section-label">Description</div>
                  <div class="detail-text">{project.description}</div>
                </div>
              )}

              {tags.length > 0 && (
                <div class="detail-section">
                  <div class="detail-section-label">Tags</div>
                  <div class="detail-text">{tags.join(", ")}</div>
                </div>
              )}

              {images.length > 0 && (
                <div class="detail-section">
                  <div class="detail-section-label">Images ({images.length})</div>
                  <div class="detail-images">
                    {images.map((img) => (
                      <div
                        class={`detail-image-thumb ${img.cloudflare_id === project.main_image_id ? "detail-image-main" : ""}`}
                      >
                        <img src={getImageUrl(img.cloudflare_id, "thumb")} alt={img.caption || ""} loading="lazy" />
                        {img.cloudflare_id === project.main_image_id && <span class="image-badge">Main</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {socialLinks.length > 0 && (
                <div class="detail-section">
                  <div class="detail-section-label">Links</div>
                  <div class="detail-links">
                    {socialLinks.map((link) => (
                      <a href={link} target="_blank" rel="noopener noreferrer" class="detail-link">
                        {new URL(link).hostname}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div class="detail-metadata">
                <div class="detail-meta-item">
                  <span class="meta-label">ID</span>
                  <span class="meta-value">{project.id}</span>
                </div>
                <div class="detail-meta-item">
                  <span class="meta-label">Slug</span>
                  <span class="meta-value">{project.slug}</span>
                </div>
                <div class="detail-meta-item">
                  <span class="meta-label">Created</span>
                  <span class="meta-value">{formatDate(project.created_at)}</span>
                </div>
                <div class="detail-meta-item">
                  <span class="meta-label">Updated</span>
                  <span class="meta-value">{formatDate(project.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
});

// Project edit page
adminRoutes.get("/projects/:id/edit", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const message = c.req.query("message");

  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first<Project>();

  if (!project) {
    return c.redirect("/admin");
  }

  const { results: images } = await c.env.DB.prepare(
    "SELECT * FROM project_images WHERE project_id = ? ORDER BY sort_order ASC, id ASC"
  )
    .bind(id)
    .all<ProjectImage>();

  const socialLinks: string[] = project.social_links ? JSON.parse(project.social_links) : [];
  const tags: string[] = project.tags ? JSON.parse(project.tags) : [];

  // Get available years
  const { results: yearResults } = await c.env.DB.prepare(
    "SELECT DISTINCT academic_year FROM projects ORDER BY academic_year DESC"
  ).all<{ academic_year: string }>();
  const years = yearResults.map((r) => r.academic_year);

  return c.html(
    <AdminLayout title={`Edit - ${project.student_name}`} user={user}>
      <div class="admin-panel">
        <AdminTabs activeTab="projects" />
        <form method="post" action={`/admin/projects/${id}`} class="edit-modal-body">
          <div
            class="edit-modal-header"
            style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--admin-border); display: flex; justify-content: space-between; align-items: center;"
          >
            <div style="display: flex; align-items: center; gap: 1rem;">
              <a href={`/admin/projects/${id}`} class="btn btn-secondary">
                Cancel
              </a>
              <h2 style="margin: 0; font-size: 1.125rem;">Edit Project</h2>
            </div>
            <div style="display: flex; gap: 0.75rem;">
              {message === "saved" && (
                <span class="save-indicator saved">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Saved
                </span>
              )}
              <button type="submit" class="btn btn-primary">
                Save Changes
              </button>
            </div>
          </div>

          <div style="padding: 1.5rem; overflow-y: auto;">
            <div class="edit-sections">
              {/* Identity Section */}
              <div class="edit-section">
                <div class="edit-section-header">
                  <h3 class="edit-section-title">Identity</h3>
                </div>
                <div class="edit-section-content">
                  <div class="edit-row">
                    <div class="edit-field">
                      <label class="edit-label" for="student_name">
                        Student Name
                      </label>
                      <input
                        type="text"
                        id="student_name"
                        name="student_name"
                        value={project.student_name}
                        class="edit-input"
                        required
                      />
                    </div>
                    <div class="edit-field">
                      <label class="edit-label" for="project_title">
                        Project Title
                      </label>
                      <input
                        type="text"
                        id="project_title"
                        name="project_title"
                        value={project.project_title}
                        class="edit-input"
                        required
                      />
                    </div>
                  </div>
                  <div class="edit-row">
                    <div class="edit-field">
                      <label class="edit-label" for="context">
                        Context
                      </label>
                      <select id="context" name="context" class="edit-select" required>
                        {CONTEXTS.map((ctx) => (
                          <option value={ctx} selected={project.context === ctx}>
                            {ctx}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div class="edit-field">
                      <label class="edit-label" for="academic_year">
                        Academic Year
                      </label>
                      <select id="academic_year" name="academic_year" class="edit-select" required>
                        {years.map((y) => (
                          <option value={y} selected={project.academic_year === y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div class="edit-section">
                <div class="edit-section-header">
                  <h3 class="edit-section-title">Status</h3>
                </div>
                <div class="edit-section-content">
                  <div class="edit-status-row">
                    {STATUSES.map((s) => (
                      <label class={`edit-status-option ${project.status === s ? "active" : ""}`}>
                        <input
                          type="radio"
                          name="status"
                          value={s}
                          checked={project.status === s}
                          style="display: none;"
                        />
                        {formatStatus(s)}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bio & Description Section */}
              <div class="edit-section">
                <div class="edit-section-header">
                  <h3 class="edit-section-title">Bio & Description</h3>
                </div>
                <div class="edit-section-content">
                  <div class="edit-field">
                    <label class="edit-label" for="bio">
                      Bio
                    </label>
                    <textarea id="bio" name="bio" class="edit-textarea" placeholder="Student bio...">
                      {project.bio || ""}
                    </textarea>
                  </div>
                  <div class="edit-field">
                    <label class="edit-label" for="description">
                      Project Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      class="edit-textarea tall"
                      placeholder="Project description..."
                    >
                      {project.description || ""}
                    </textarea>
                  </div>
                </div>
              </div>

              {/* Tags Section */}
              <div class="edit-section">
                <div class="edit-section-header">
                  <h3 class="edit-section-title">Tags</h3>
                </div>
                <div class="edit-section-content">
                  <div class="edit-field">
                    <label class="edit-label" for="tags">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      id="tags"
                      name="tags"
                      value={tags.join(", ")}
                      class="edit-input"
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>
                </div>
              </div>

              {/* Links Section */}
              <div class="edit-section">
                <div class="edit-section-header">
                  <h3 class="edit-section-title">Social Links</h3>
                </div>
                <div class="edit-section-content">
                  <div class="edit-links-list" id="links-container">
                    {socialLinks.map((link, i) => (
                      <div class="edit-link-row">
                        <input
                          type="text"
                          name={`link_${i}`}
                          value={link}
                          class="edit-input"
                          placeholder="https://..."
                        />
                        <button type="button" class="edit-link-remove" onclick="this.parentElement.remove()">
                          &times;
                        </button>
                      </div>
                    ))}
                    {socialLinks.length === 0 && (
                      <div class="edit-link-row">
                        <input type="text" name="link_0" value="" class="edit-input" placeholder="https://..." />
                        <button type="button" class="edit-link-remove" onclick="this.parentElement.remove()">
                          &times;
                        </button>
                      </div>
                    )}
                  </div>
                  <button type="button" class="edit-link-add" id="add-link-btn">
                    + Add Link
                  </button>
                </div>
              </div>

              {/* Images Section */}
              <div class="edit-section">
                <div class="edit-section-header">
                  <h3 class="edit-section-title">Images</h3>
                </div>
                <div class="edit-section-content">
                  <div class="media-manager">
                    <div class="edit-images-grid" id="images-grid" data-project-id={project.id}>
                      {images.map((img, index) => (
                        <div
                          class={`edit-image-item ${img.cloudflare_id === project.main_image_id ? "is-main" : ""}`}
                          data-image-id={img.id}
                          data-cloudflare-id={img.cloudflare_id}
                        >
                          <img src={getImageUrl(img.cloudflare_id, "thumb")} alt={img.caption || ""} loading="lazy" />
                          <span class="edit-image-order">{index + 1}</span>
                          {img.cloudflare_id === project.main_image_id && <span class="edit-image-badge">Main</span>}
                          <div class="edit-image-actions">
                            <button
                              type="button"
                              class="edit-image-action"
                              title="Set as main"
                              data-action="set-main"
                              data-cloudflare-id={img.cloudflare_id}
                            >
                              &#9733;
                            </button>
                            <button
                              type="button"
                              class="edit-image-action"
                              title="Edit caption"
                              data-action="edit-caption"
                              data-image-id={img.id}
                            >
                              &#9998;
                            </button>
                            <button
                              type="button"
                              class="edit-image-action edit-image-action-delete"
                              title="Delete"
                              data-action="delete"
                              data-image-id={img.id}
                            >
                              &times;
                            </button>
                          </div>
                          {img.caption && <div class="edit-image-caption">{img.caption}</div>}
                        </div>
                      ))}
                      <label class="upload-tile" id="upload-tile">
                        <input type="file" accept="image/*" style="display: none;" id="image-upload-input" />
                        <span class="upload-tile-icon">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                          >
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        </span>
                        <span class="upload-tile-label">Upload</span>
                      </label>
                    </div>
                    <p class="edit-images-hint">Drag images to reorder. First image is used as main if not set.</p>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div class="edit-section" style="border-color: #dc2626;">
                <div class="edit-section-header" style="background: #fef2f2;">
                  <h3 class="edit-section-title" style="color: #dc2626;">
                    Danger Zone
                  </h3>
                </div>
                <div class="edit-section-content">
                  <button
                    type="button"
                    class="btn btn-danger"
                    id="delete-project-btn"
                    data-project-id={project.id}
                    data-project-name={project.student_name}
                  >
                    Delete Project
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
      <script src="/admin/edit.js" type="module"></script>
    </AdminLayout>
  );
});

// Handle project form submission
adminRoutes.post("/projects/:id", async (c) => {
  const id = c.req.param("id");
  const formData = await c.req.formData();

  // Check project exists
  const existing = await c.env.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(id).first();
  if (!existing) {
    return c.redirect("/admin");
  }

  // Extract form values
  const studentName = formData.get("student_name") as string;
  const projectTitle = formData.get("project_title") as string;
  const context = formData.get("context") as string;
  const academicYear = formData.get("academic_year") as string;
  const status = formData.get("status") as string;
  const bio = formData.get("bio") as string;
  const description = formData.get("description") as string;
  const tagsInput = formData.get("tags") as string;

  // Parse tags
  const tags = tagsInput
    ? tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // Collect links from form
  const links: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("link_") && value) {
      const url = value.toString().trim();
      if (url) {
        links.push(url);
      }
    }
  }

  // Update project
  await c.env.DB.prepare(
    `UPDATE projects SET
      student_name = ?,
      project_title = ?,
      context = ?,
      academic_year = ?,
      status = ?,
      bio = ?,
      description = ?,
      tags = ?,
      social_links = ?,
      updated_at = datetime('now')
    WHERE id = ?`
  )
    .bind(
      studentName,
      projectTitle,
      context,
      academicYear,
      status,
      bio || null,
      description,
      JSON.stringify(tags),
      JSON.stringify(links),
      id
    )
    .run();

  return c.redirect(`/admin/projects/${id}/edit?message=saved`);
});

// Users list page
adminRoutes.get("/users", async (c) => {
  const user = c.get("user");
  const roleFilter = c.req.query("role");
  const search = c.req.query("q");

  let query = "SELECT * FROM users";
  const params: string[] = [];
  const conditions: string[] = [];

  if (roleFilter) {
    conditions.push("role = ?");
    params.push(roleFilter);
  }

  if (search) {
    conditions.push("(email LIKE ? OR name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY created_at DESC";

  const { results: users } = await c.env.DB.prepare(query)
    .bind(...params)
    .all<User>();

  const countResult = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>();
  const totalCount = countResult?.count ?? 0;

  return c.html(
    <AdminLayout title="Users" user={user}>
      <div class="admin-panel">
        <AdminTabs activeTab="users" />
        <div class="admin-list">
          <div class="admin-list-header">
            <h2>Users</h2>
            <div class="admin-filters">
              <form method="get" action="/admin/users" class="search-container">
                <input
                  type="text"
                  name="q"
                  placeholder="Search..."
                  value={search || ""}
                  class="search-input"
                  style="width: 140px;"
                />
                {roleFilter && <input type="hidden" name="role" value={roleFilter} />}
              </form>
              <select
                name="role"
                class="filter-select"
                onchange="window.location.href='/admin/users?' + new URLSearchParams({...Object.fromEntries(new URLSearchParams(window.location.search)), role: this.value}).toString()"
              >
                <option value="">All roles</option>
                <option value="admin" selected={roleFilter === "admin"}>
                  Admin
                </option>
                <option value="editor" selected={roleFilter === "editor"}>
                  Editor
                </option>
                <option value="student" selected={roleFilter === "student"}>
                  Student
                </option>
              </select>
              <span class="filter-count">
                {users.length} / {totalCount}
              </span>
              <a href="/admin/users/new" class="btn btn-primary" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;">
                + New User
              </a>
            </div>
          </div>
          <div class="admin-list-scroll">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr class="row-clickable" onclick={`window.location.href='/admin/users/${u.id}'`}>
                    <td>{u.email}</td>
                    <td>{u.name || "-"}</td>
                    <td>
                      <span class={`role-pill role-${u.role}`}>{u.role}</span>
                    </td>
                    <td>{formatDate(u.created_at)}</td>
                    <td>{formatDate(u.last_login_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <div class="admin-list-message">No users found.</div>}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
});

// New user page - MUST be before /users/:id to prevent "new" matching as an id
adminRoutes.get("/users/new", async (c) => {
  const user = c.get("user");
  const message = c.req.query("message");
  const error = c.req.query("error");

  return c.html(
    <AdminLayout title="New User" user={user}>
      <div class="admin-panel">
        <AdminTabs activeTab="users" />
        <div style="padding: 2rem; max-width: 600px;">
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;">
            <a href="/admin/users" class="btn btn-secondary">
              Cancel
            </a>
            <h2 style="margin: 0;">Create New User</h2>
          </div>

          {message === "created" && (
            <div class="success-message" style="margin-bottom: 1.5rem;">
              User created successfully.
            </div>
          )}

          {error && (
            <div class="error-message" style="margin-bottom: 1.5rem;">
              {error}
            </div>
          )}

          <form method="post" action="/admin/users">
            <div class="edit-section">
              <div class="edit-section-header">
                <h3 class="edit-section-title">User Details</h3>
              </div>
              <div class="edit-section-content">
                <div class="edit-field">
                  <label class="edit-label" for="email">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    class="edit-input"
                    required
                    placeholder="user@example.com"
                  />
                </div>
                <div class="edit-field">
                  <label class="edit-label" for="name">
                    Name
                  </label>
                  <input type="text" id="name" name="name" class="edit-input" placeholder="Full name (optional)" />
                </div>
                <div class="edit-field">
                  <label class="edit-label" for="role">
                    Role
                  </label>
                  <select id="role" name="role" class="edit-select" required>
                    <option value="student">Student</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>
            <div style="margin-top: 1.5rem;">
              <button type="submit" class="btn btn-primary">
                Create User
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
});

// Handle user creation
adminRoutes.post("/users", async (c) => {
  const formData = await c.req.formData();

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string)?.trim() || null;
  const role = formData.get("role") as string;

  if (!email) {
    return c.redirect("/admin/users/new?error=Email is required");
  }

  // Check if user exists
  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) {
    return c.redirect("/admin/users/new?error=Email already exists");
  }

  // Validate role
  const validRoles = ["student", "editor", "admin"];
  if (!validRoles.includes(role)) {
    return c.redirect("/admin/users/new?error=Invalid role");
  }

  // Create user
  const userId = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)")
    .bind(userId, email, name, role)
    .run();

  return c.redirect(`/admin/users/${userId}`);
});

// User detail page
adminRoutes.get("/users/:id", async (c) => {
  const currentUser = c.get("user");
  const id = c.req.param("id");

  const targetUser = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<User>();

  if (!targetUser) {
    return c.redirect("/admin/users");
  }

  return c.html(
    <AdminLayout title={targetUser.email} user={currentUser}>
      <div class="admin-panel">
        <AdminTabs activeTab="users" />
        <div class="admin-split">
          <div class="admin-list">
            <div class="admin-list-header">
              <a href="/admin/users" style="text-decoration: none; color: inherit;">
                <h2>&larr; Back to list</h2>
              </a>
            </div>
          </div>
          <div class="admin-detail-panel">
            <div class="admin-detail-content">
              <div class="detail-header-row">
                <h3>{targetUser.email}</h3>
                <div class="detail-header-actions">
                  <span class={`role-pill role-${targetUser.role}`}>{targetUser.role}</span>
                </div>
              </div>
              <p class="detail-title">{targetUser.name || "(no name)"}</p>

              <div class="detail-metadata" style="margin-top: 2rem;">
                <div class="detail-meta-item">
                  <span class="meta-label">ID</span>
                  <span class="meta-value">{targetUser.id}</span>
                </div>
                <div class="detail-meta-item">
                  <span class="meta-label">Role</span>
                  <span class="meta-value">{targetUser.role}</span>
                </div>
                <div class="detail-meta-item">
                  <span class="meta-label">Created</span>
                  <span class="meta-value">{formatDate(targetUser.created_at)}</span>
                </div>
                <div class="detail-meta-item">
                  <span class="meta-label">Last Login</span>
                  <span class="meta-value">{formatDate(targetUser.last_login_at)}</span>
                </div>
              </div>

              {currentUser.role === "admin" && targetUser.id !== currentUser.userId && (
                <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--admin-border);">
                  <button
                    type="button"
                    class="btn btn-danger"
                    id="delete-user-btn"
                    data-user-id={targetUser.id}
                    data-user-email={targetUser.email}
                  >
                    Delete User
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <script src="/admin/admin.js" type="module"></script>
    </AdminLayout>
  );
});
