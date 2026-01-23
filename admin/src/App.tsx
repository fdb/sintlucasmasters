import { useEffect, useRef } from "react";
import { Sun, Moon, LogOut, Search, Pencil, X, GripVertical, Plus, Trash2, Star, SquareArrowOutUpRight } from "lucide-react";
import { useAdminStore } from "./store/adminStore";

const CONTEXTS = [
  "Autonomous Context",
  "Applied Context",
  "Digital Context",
  "Socio-Political Context",
  "Jewelry Context",
];

const PROGRAMS = ["BA_FO", "BA_BK", "MA_BK", "PREMA_BK"];

const STATUSES = ["draft", "submitted", "ready_for_print", "published"];

export default function App() {
  const {
    user,
    status,
    tables,
    activeTable,
    tableData,
    tableStatus,
    selectedProjectId,
    projectDetail,
    projectStatus,
    selectedYear,
    selectedContext,
    searchQuery,
    searchExpanded,
    darkMode,
    userMenuOpen,
    editModalOpen,
    editDraft,
    editImages,
    saveStatus,
    draggedImageId,
    newTag,
    loadSession,
    setActiveTable,
    selectProject,
    openEditForProject,
    closeEdit,
    updateEditField,
    setNewTag,
    addTag,
    removeTag,
    addSocialLink,
    updateSocialLink,
    removeSocialLink,
    setDraggedImageId,
    reorderImages,
    setMainImage,
    saveProject,
    toggleDarkMode,
    setUserMenuOpen,
    setSelectedYear,
    setSelectedContext,
    setSearchQuery,
    setSearchExpanded,
  } = useAdminStore((state) => ({
    user: state.user,
    status: state.status,
    tables: state.tables,
    activeTable: state.activeTable,
    tableData: state.tableData,
    tableStatus: state.tableStatus,
    selectedProjectId: state.selectedProjectId,
    projectDetail: state.projectDetail,
    projectStatus: state.projectStatus,
    selectedYear: state.selectedYear,
    selectedContext: state.selectedContext,
    searchQuery: state.searchQuery,
    searchExpanded: state.searchExpanded,
    darkMode: state.darkMode,
    userMenuOpen: state.userMenuOpen,
    editModalOpen: state.editModalOpen,
    editDraft: state.editDraft,
    editImages: state.editImages,
    saveStatus: state.saveStatus,
    draggedImageId: state.draggedImageId,
    newTag: state.newTag,
    loadSession: state.loadSession,
    setActiveTable: state.setActiveTable,
    selectProject: state.selectProject,
    openEditForProject: state.openEditForProject,
    closeEdit: state.closeEdit,
    updateEditField: state.updateEditField,
    setNewTag: state.setNewTag,
    addTag: state.addTag,
    removeTag: state.removeTag,
    addSocialLink: state.addSocialLink,
    updateSocialLink: state.updateSocialLink,
    removeSocialLink: state.removeSocialLink,
    setDraggedImageId: state.setDraggedImageId,
    reorderImages: state.reorderImages,
    setMainImage: state.setMainImage,
    saveProject: state.saveProject,
    toggleDarkMode: state.toggleDarkMode,
    setUserMenuOpen: state.setUserMenuOpen,
    setSelectedYear: state.setSelectedYear,
    setSelectedContext: state.setSelectedContext,
    setSearchQuery: state.setSearchQuery,
    setSearchExpanded: state.setSearchExpanded,
  }));

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("admin-dark-mode", String(darkMode));
  }, [darkMode]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen, setUserMenuOpen]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/auth/login";
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editModalOpen) {
        closeEdit();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [editModalOpen, closeEdit]);

  // Drag and drop for images
  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    setDraggedImageId(imageId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    reorderImages(targetId);
  };

  const columns = tableData?.rows[0] ? Object.keys(tableData.rows[0]) : [];
  const isProjectsTable = activeTable === "projects";

  // Extract unique years and contexts for filters
  const allYears =
    isProjectsTable && tableData
      ? [...new Set(tableData.rows.map((r) => String(r.academic_year || "")).filter(Boolean))].sort().reverse()
      : [];
  const allContexts =
    isProjectsTable && tableData
      ? [...new Set(tableData.rows.map((r) => String(r.context || "")).filter(Boolean))].sort()
      : [];
  const defaultYear = allYears[0] || "";

  // Set default year to latest when data loads
  useEffect(() => {
    if (isProjectsTable && defaultYear && !selectedYear) {
      setSelectedYear(defaultYear);
    }
  }, [defaultYear, isProjectsTable, selectedYear, setSelectedYear]);

  // Filter rows
  const filteredRows =
    isProjectsTable && tableData
      ? tableData.rows.filter((row) => {
          const yearMatch = !selectedYear || String(row.academic_year) === selectedYear;
          const contextMatch = !selectedContext || String(row.context) === selectedContext;
          const searchLower = searchQuery.toLowerCase();
          const searchMatch =
            !searchQuery ||
            String(row.student_name || "")
              .toLowerCase()
              .includes(searchLower) ||
            String(row.project_title || "")
              .toLowerCase()
              .includes(searchLower);
          return yearMatch && contextMatch && searchMatch;
        })
      : tableData?.rows || [];

  // For the compact table view, show only key columns
  const displayColumns = isProjectsTable
    ? columns.filter((col) => ["student_name", "project_title", "context", "academic_year"].includes(col))
    : columns.slice(0, 4);

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <h1>Admin</h1>
          <p>Data viewer for Sint Lucas Masters.</p>
        </div>
        <div className="admin-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleDarkMode}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {user && (
            <div className="user-menu" ref={userMenuRef}>
              <button
                type="button"
                className="user-avatar"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                title={user.email}
              >
                {user.email.charAt(0).toUpperCase()}
              </button>
              {userMenuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-email">{user.email}</div>
                  <button type="button" onClick={handleLogout}>
                    <LogOut size={14} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {status === "loading" && <p>Loading your session…</p>}
      {status === "error" && <p className="error-message">Unable to load your session.</p>}

      {status === "ready" && tables.length > 0 && (
        <div className="admin-panel">
          <nav className="admin-tabs">
            {tables.map((table) => (
              <button
                key={table}
                type="button"
                className={table === activeTable ? "active" : ""}
                onClick={() => setActiveTable(table)}
              >
                {table.replace("_", " ")}
              </button>
            ))}
          </nav>

          <div className="admin-split">
            {/* Left: Table list */}
            <div className="admin-list">
              <div className="admin-list-header">
                <h2>{activeTable.replace("_", " ")}</h2>
                {isProjectsTable && tableData && (
                  <div className="admin-filters">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="filter-select"
                    >
                      <option value="">All years</option>
                      {allYears.map((year) => (
                        <option key={year} value={year}>
                          {formatAcademicYear(year)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedContext}
                      onChange={(e) => setSelectedContext(e.target.value)}
                      className="filter-select"
                    >
                      <option value="">All contexts</option>
                      {allContexts.map((ctx) => (
                        <option key={ctx} value={ctx}>
                          {ctx.replace(" Context", "")}
                        </option>
                      ))}
                    </select>
                    <div className={`search-container ${searchExpanded ? "expanded" : ""}`}>
                      {searchExpanded ? (
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search..."
                          className="search-input"
                          autoFocus
                          onBlur={() => {
                            if (!searchQuery) setSearchExpanded(false);
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          className="search-toggle"
                          onClick={() => setSearchExpanded(true)}
                          title="Search"
                        >
                          <Search size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {tableStatus === "loading" && <p className="admin-list-message">Loading data…</p>}
              {tableStatus === "error" && <p className="admin-list-message error-message">Failed to load data.</p>}
              {tableStatus === "ready" && (!tableData || tableData.rows.length === 0) && (
                <p className="admin-list-message">No rows found.</p>
              )}

              {tableStatus === "ready" && tableData && filteredRows.length > 0 && (
                <div className="admin-list-scroll">
                  <table>
                    <thead>
                      <tr>
                        {displayColumns.map((column) => (
                          <th key={column}>{column.replace("_", " ")}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row, rowIndex) => {
                        const rowId = typeof row.id === "string" ? row.id : null;
                        const isSelected = isProjectsTable && rowId === selectedProjectId;
                        const rowStatus = String(row.status || "draft").toLowerCase();
                        return (
                          <tr
                            key={`${activeTable}-${rowIndex}`}
                            className={`${isProjectsTable ? `row-clickable status-${rowStatus}` : ""} ${isSelected ? "row-selected" : ""}`}
                            onClick={() => {
                              if (!isProjectsTable || !rowId) return;
                              selectProject(rowId);
                            }}
                            onDoubleClick={() => {
                              if (!isProjectsTable || !rowId) return;
                              openEditForProject(rowId);
                            }}
                          >
                            {displayColumns.map((column) => (
                              <td key={column}>
                                {column === "role" ? (
                                  <span className={`role-pill role-${String(row[column] || "student").toLowerCase()}`}>
                                    {String(row[column] || "student")}
                                  </span>
                                ) : column === "context" ? (
                                  formatContext(row[column])
                                ) : column === "academic_year" ? (
                                  formatAcademicYear(row[column])
                                ) : (
                                  formatCell(row[column])
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {tableStatus === "ready" && tableData && tableData.rows.length > 0 && filteredRows.length === 0 && (
                <p className="admin-list-message">No matches found.</p>
              )}
            </div>

            {/* Right: Detail panel */}
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
                  {/* Header: Name + Status + Actions */}
                  <div className="detail-header-row">
                    <h3>{String(projectDetail.project.student_name || "Untitled")}</h3>
                    <div className="detail-header-actions">
                      <div
                        className={`status-badge status-${String(projectDetail.project.status || "draft").toLowerCase()}`}
                      >
                        {String(projectDetail.project.status || "draft").replace(/_/g, " ")}
                      </div>
                      <div className="detail-action-group">
                        <button type="button" className="detail-action-btn has-label" onClick={() => openEditForProject()}>
                          <Pencil size={14} />
                          Edit
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

                  {/* Project title */}
                  <div className="detail-title">{String(projectDetail.project.project_title || "")}</div>

                  {/* Program + Context */}
                  <div className="detail-program-context">
                    <span className="detail-program">{String(projectDetail.project.program || "")}</span>
                    {projectDetail.project.program && projectDetail.project.context && " · "}
                    <span className="detail-context">{String(projectDetail.project.context || "")}</span>
                  </div>

                  {/* Academic year */}
                  <div className="detail-year">{String(projectDetail.project.academic_year || "")}</div>

                  {/* Images */}
                  <div className="detail-section">
                    <div className="detail-section-label">Images</div>
                    <div className="detail-images">
                      {/* Main image first */}
                      {projectDetail.project.main_image_id && (
                        <div className="detail-image-thumb detail-image-main">
                          <img
                            src={`https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/${projectDetail.project.main_image_id}/thumb`}
                            alt="Main image"
                            loading="lazy"
                          />
                          <span className="image-badge">Main</span>
                        </div>
                      )}
                      {/* Additional images */}
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

                  {/* Bio */}
                  {projectDetail.project.bio && (
                    <div className="detail-section">
                      <div className="detail-section-label">Bio</div>
                      <div className="detail-text">{String(projectDetail.project.bio)}</div>
                    </div>
                  )}

                  {/* Description */}
                  {projectDetail.project.description && (
                    <div className="detail-section">
                      <div className="detail-section-label">Description</div>
                      <div className="detail-text">{String(projectDetail.project.description)}</div>
                    </div>
                  )}

                  {/* Social links */}
                  {projectDetail.project.social_links && (
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
                  )}

                  {/* Metadata footer */}
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
                    {projectDetail.project.user_id && (
                      <div className="detail-meta-item">
                        <span className="meta-label">User ID</span>
                        <span className="meta-value">{String(projectDetail.project.user_id)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <div className={`edit-modal-overlay ${editModalOpen ? "is-open" : ""}`} onClick={closeEdit}>
        <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
          <div className="edit-modal-header">
            <h2>Edit Project</h2>
            <button type="button" className="edit-modal-close" onClick={closeEdit}>
              <X size={18} />
            </button>
          </div>

          <div className="edit-modal-body">
            {editDraft && (
              <div className="edit-sections">
                {/* Identity Section */}
                <div className="edit-section">
                  <div className="edit-section-header">
                    <h3 className="edit-section-title">Identity</h3>
                  </div>
                  <div className="edit-section-content">
                    <div className="edit-row">
                      <div className="edit-field">
                        <label className="edit-label">Student Name</label>
                        <input
                          type="text"
                          className="edit-input"
                          value={editDraft.student_name}
                          onChange={(e) => updateEditField("student_name", e.target.value)}
                        />
                      </div>
                      <div className="edit-field">
                        <label className="edit-label">Project Title</label>
                        <input
                          type="text"
                          className="edit-input"
                          value={editDraft.project_title}
                          onChange={(e) => updateEditField("project_title", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Classification Section */}
                <div className="edit-section">
                  <div className="edit-section-header">
                    <h3 className="edit-section-title">Classification</h3>
                  </div>
                  <div className="edit-section-content">
                    <div className="edit-row">
                      <div className="edit-field">
                        <label className="edit-label">Context</label>
                        <select
                          className="edit-select"
                          value={editDraft.context}
                          onChange={(e) => updateEditField("context", e.target.value)}
                        >
                          <option value="">Select context...</option>
                          {CONTEXTS.map((ctx) => (
                            <option key={ctx} value={ctx}>
                              {ctx}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="edit-field">
                        <label className="edit-label">Program</label>
                        <select
                          className="edit-select"
                          value={editDraft.program}
                          onChange={(e) => updateEditField("program", e.target.value)}
                        >
                          <option value="">Select program...</option>
                          {PROGRAMS.map((prog) => (
                            <option key={prog} value={prog}>
                              {prog.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="edit-row" style={{ marginTop: "1rem" }}>
                      <div className="edit-field">
                        <label className="edit-label">Academic Year</label>
                        <input
                          type="text"
                          className="edit-input"
                          value={editDraft.academic_year}
                          onChange={(e) => updateEditField("academic_year", e.target.value)}
                          placeholder="2024-2025"
                        />
                      </div>
                      <div className="edit-field">
                        <label className="edit-label">Status</label>
                        <div className="edit-status-row">
                          {STATUSES.map((status) => (
                            <button
                              key={status}
                              type="button"
                              className={`edit-status-option ${editDraft.status === status ? "active" : ""}`}
                              onClick={() => updateEditField("status", status)}
                            >
                              {status.replace(/_/g, " ")}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="edit-section">
                  <div className="edit-section-header">
                    <h3 className="edit-section-title">Content</h3>
                  </div>
                  <div className="edit-section-content">
                    <div className="edit-field">
                      <label className="edit-label">Bio</label>
                      <textarea
                        className="edit-textarea"
                        value={editDraft.bio}
                        onChange={(e) => updateEditField("bio", e.target.value)}
                        placeholder="Short biography of the student..."
                      />
                    </div>
                    <div className="edit-field">
                      <label className="edit-label">Project Description</label>
                      <textarea
                        className="edit-textarea tall"
                        value={editDraft.description}
                        onChange={(e) => updateEditField("description", e.target.value)}
                        placeholder="Describe the project..."
                      />
                    </div>
                  </div>
                </div>

                {/* Media Section */}
                <div className="edit-section">
                  <div className="edit-section-header">
                    <h3 className="edit-section-title">Media</h3>
                  </div>
                  <div className="edit-section-content">
                    <div className="edit-images-grid">
                      {editImages.map((img, idx) => (
                        <div
                          key={img.id}
                          className={`edit-image-item ${draggedImageId === img.id ? "dragging" : ""} ${editDraft.main_image_id === img.cloudflare_id ? "is-main" : ""}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, img.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, img.id)}
                        >
                          <img
                            src={`https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/${img.cloudflare_id}/thumb`}
                            alt={`Image ${idx + 1}`}
                            loading="lazy"
                          />
                          <span className="edit-image-order">{idx + 1}</span>
                          {editDraft.main_image_id === img.cloudflare_id && (
                            <span className="edit-image-badge">Main</span>
                          )}
                          <div className="edit-image-actions">
                            <button
                              type="button"
                              className="edit-image-action"
                              onClick={() => setMainImage(img.cloudflare_id)}
                              title="Set as main image"
                            >
                              <Star size={10} />
                            </button>
                          </div>
                          {img.caption && <span className="edit-image-caption">{img.caption}</span>}
                        </div>
                      ))}
                    </div>
                    <p className="edit-images-hint">
                      <GripVertical size={12} style={{ display: "inline", verticalAlign: "middle" }} /> Drag images to reorder. Click the star to set as main image.
                    </p>
                  </div>
                </div>

                {/* Links & Tags Section */}
                <div className="edit-section">
                  <div className="edit-section-header">
                    <h3 className="edit-section-title">Links & Tags</h3>
                  </div>
                  <div className="edit-section-content">
                    <div className="edit-field">
                      <label className="edit-label">Tags</label>
                      <div className="edit-tags">
                        {editDraft.tags.map((tag) => (
                          <span key={tag} className="edit-tag">
                            {tag}
                            <button type="button" className="edit-tag-remove" onClick={() => removeTag(tag)}>
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          className="edit-tag-input"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addTag();
                            }
                          }}
                          placeholder="Add tag..."
                        />
                      </div>
                    </div>
                    <div className="edit-field">
                      <label className="edit-label">Social Links</label>
                      <div className="edit-links-list">
                        {editDraft.social_links.map((link, idx) => (
                          <div key={idx} className="edit-link-row">
                            <input
                              type="text"
                              className="edit-input"
                              value={link}
                              onChange={(e) => updateSocialLink(idx, e.target.value)}
                              placeholder="https://..."
                            />
                            <button
                              type="button"
                              className="edit-link-remove"
                              onClick={() => removeSocialLink(idx)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        <button type="button" className="edit-link-add" onClick={addSocialLink}>
                          <Plus size={12} />
                          Add link
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="edit-modal-footer">
            <div className="edit-modal-footer-left">
              {saveStatus === "saving" && (
                <span className="save-indicator saving">
                  <span className="spinner" />
                  Saving...
                </span>
              )}
              {saveStatus === "saved" && <span className="save-indicator saved">Saved successfully</span>}
              {saveStatus === "error" && <span className="save-indicator error">Failed to save</span>}
            </div>
            <div className="edit-modal-footer-right">
              <button type="button" className="btn btn-secondary" onClick={closeEdit}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveProject}
                disabled={saveStatus === "saving"}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return JSON.stringify(value);
}

function formatContext(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return String(value).replace(/ Context$/, "");
}

function formatAcademicYear(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const str = String(value);
  // Convert "2022-2023" to "22-23"
  const match = str.match(/^(\d{4})-(\d{4})$/);
  if (match) {
    return `${match[1].slice(2)}-${match[2].slice(2)}`;
  }
  return str;
}

function parseSocialLinks(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((l) => typeof l === "string");
    } catch {
      // Not JSON, try splitting by newline or comma
      return value
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  if (Array.isArray(value)) return value.filter((l) => typeof l === "string");
  return [];
}

function formatDate(value: unknown): string {
  if (!value || typeof value !== "string") return "—";
  try {
    const date = new Date(value);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}
