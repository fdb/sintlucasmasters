import { Pencil, SquareArrowOutUpRight, Trash2 } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import { formatDate } from "../utils";
import { ConfirmDialog } from "./ConfirmDialog";

export function ProjectDetailPanel() {
  const {
    activeTable,
    selectedProjectId,
    projectDetail,
    projectStatus,
    openEditForProject,
    deleteConfirmOpen,
    deleteStatus,
    openDeleteConfirm,
    closeDeleteConfirm,
    deleteProject,
  } = useAdminStore((state) => ({
    activeTable: state.activeTable,
    selectedProjectId: state.selectedProjectId,
    projectDetail: state.projectDetail,
    projectStatus: state.projectStatus,
    openEditForProject: state.openEditForProject,
    deleteConfirmOpen: state.deleteConfirmOpen,
    deleteStatus: state.deleteStatus,
    openDeleteConfirm: state.openDeleteConfirm,
    closeDeleteConfirm: state.closeDeleteConfirm,
    deleteProject: state.deleteProject,
  }));

  const isProjectsTable = activeTable === "projects";

  return (
    <div className="admin-detail-panel">
      {!isProjectsTable && (
        <div className="admin-detail-empty">
          <p>Select a row to view details</p>
        </div>
      )}

      {isProjectsTable && !selectedProjectId && (
        <div className="admin-detail-empty">
          <span className="detail-icon">←</span>
          <p>Select a project from the list</p>
        </div>
      )}

      {isProjectsTable && projectStatus === "loading" && (
        <div className="admin-detail-empty">
          <p>Loading project…</p>
        </div>
      )}

      {isProjectsTable && projectStatus === "error" && (
        <div className="admin-detail-empty">
          <p className="error-message">Failed to load project.</p>
        </div>
      )}

      {isProjectsTable && projectStatus === "ready" && projectDetail && (
        <div className="admin-detail-content">
          <div className="detail-header-row">
            <h3>{String(projectDetail.project.student_name || "Untitled")}</h3>
            <div className="detail-header-actions">
              <div className={`status-badge status-${String(projectDetail.project.status || "draft").toLowerCase()}`}>
                {String(projectDetail.project.status || "draft").replace(/_/g, " ")}
              </div>
              <div className="detail-action-group">
                <button type="button" className="detail-action-btn has-label" onClick={() => openEditForProject()}>
                  <Pencil size={14} />
                  Edit
                </button>
                <button
                  type="button"
                  className="detail-action-btn has-label danger"
                  onClick={openDeleteConfirm}
                  title="Delete project"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
                <a
                  href={`/${projectDetail.project.academic_year}/students/${projectDetail.project.slug}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-action-btn"
                  title="Open project page"
                >
                  <SquareArrowOutUpRight size={14} />
                </a>
              </div>
            </div>
          </div>

          <div className="detail-title">{String(projectDetail.project.project_title || "")}</div>

          <div className="detail-program-context">
            <span className="detail-program">{String(projectDetail.project.program || "")}</span>
            {projectDetail.project.program && projectDetail.project.context ? " · " : null}
            <span className="detail-context">{String(projectDetail.project.context || "")}</span>
          </div>

          <div className="detail-year">{String(projectDetail.project.academic_year || "")}</div>

          <div className="detail-section">
            <div className="detail-section-label">Images</div>
            <div className="detail-images">
              {projectDetail.project.main_image_id ? (
                <div className="detail-image-thumb detail-image-main">
                  <img
                    src={`https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/${projectDetail.project.main_image_id}/thumb`}
                    alt="Main image"
                    loading="lazy"
                  />
                  <span className="image-badge">Main</span>
                </div>
              ) : null}
              {projectDetail.images.map((img, idx) => {
                const cloudflareId = String(img.cloudflare_id || "");
                if (!cloudflareId) return null;
                return (
                  <div key={idx} className="detail-image-thumb">
                    <img
                      src={`https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/${cloudflareId}/thumb`}
                      alt={`Image ${idx + 1}`}
                      loading="lazy"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {projectDetail.project.description ? (
            <div className="detail-section">
              <div className="detail-section-label">Description</div>
              <div className="detail-text">{String(projectDetail.project.description)}</div>
            </div>
          ) : null}

          {projectDetail.project.social_links ? (
            <div className="detail-section">
              <div className="detail-section-label">Social Links</div>
              <div className="detail-links">
                {parseSocialLinks(projectDetail.project.social_links).map((link, idx) => (
                  <a
                    key={idx}
                    href={link.startsWith("http") ? link : `https://${link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-link"
                  >
                    {link.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div className="detail-metadata">
            <div className="detail-meta-item">
              <span className="meta-label">ID</span>
              <span className="meta-value">{String(projectDetail.project.id || "")}</span>
            </div>
            <div className="detail-meta-item">
              <span className="meta-label">Slug</span>
              <span className="meta-value">{String(projectDetail.project.slug || "")}</span>
            </div>
            <div className="detail-meta-item">
              <span className="meta-label">Sort name</span>
              <span className="meta-value">{String(projectDetail.project.sort_name || "")}</span>
            </div>
            <div className="detail-meta-item">
              <span className="meta-label">Created</span>
              <span className="meta-value">{formatDate(projectDetail.project.created_at)}</span>
            </div>
            <div className="detail-meta-item">
              <span className="meta-label">Updated</span>
              <span className="meta-value">{formatDate(projectDetail.project.updated_at)}</span>
            </div>
            {projectDetail.project.user_id ? (
              <div className="detail-meta-item">
                <span className="meta-label">User ID</span>
                <span className="meta-value">{String(projectDetail.project.user_id)}</span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete project?"
        description={
          <>
            Are you sure you want to delete{" "}
            <strong>
              {String(projectDetail?.project.student_name || "")}'s project "
              {String(projectDetail?.project.project_title || "")}"
            </strong>
            ? This action cannot be undone.
          </>
        }
        onCancel={closeDeleteConfirm}
        onConfirm={deleteProject}
        isLoading={deleteStatus === "loading"}
        errorMessage={deleteStatus === "error" ? "Failed to delete project. Please try again." : null}
      />
    </div>
  );
}

function parseSocialLinks(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((l) => typeof l === "string");
    } catch {
      return value
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  if (Array.isArray(value)) return value.filter((l) => typeof l === "string");
  return [];
}
