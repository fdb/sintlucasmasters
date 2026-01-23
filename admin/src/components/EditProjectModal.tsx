import { useEffect } from "react";
import { X, GripVertical, Plus, Trash2 } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import { EditImagesGrid } from "./EditImagesGrid";

const CONTEXTS = [
  "Autonomous Context",
  "Applied Context",
  "Digital Context",
  "Socio-Political Context",
  "Jewelry Context",
];

const PROGRAMS = ["BA_FO", "BA_BK", "MA_BK", "PREMA_BK"];

const STATUSES = ["draft", "submitted", "ready_for_print", "published"];

export function EditProjectModal() {
  const {
    editModalOpen,
    editDraft,
    saveStatus,
    newTag,
    closeEdit,
    updateEditField,
    setNewTag,
    addTag,
    removeTag,
    addSocialLink,
    updateSocialLink,
    removeSocialLink,
    saveProject,
  } = useAdminStore((state) => ({
    editModalOpen: state.editModalOpen,
    editDraft: state.editDraft,
    saveStatus: state.saveStatus,
    newTag: state.newTag,
    closeEdit: state.closeEdit,
    updateEditField: state.updateEditField,
    setNewTag: state.setNewTag,
    addTag: state.addTag,
    removeTag: state.removeTag,
    addSocialLink: state.addSocialLink,
    updateSocialLink: state.updateSocialLink,
    removeSocialLink: state.removeSocialLink,
    saveProject: state.saveProject,
  }));

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editModalOpen) {
        closeEdit();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [editModalOpen, closeEdit]);

  return (
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

              <div className="edit-section">
                <div className="edit-section-header">
                  <h3 className="edit-section-title">Media</h3>
                </div>
                <div className="edit-section-content">
                  <EditImagesGrid />
                  <p className="edit-images-hint">
                    <GripVertical size={12} style={{ display: "inline", verticalAlign: "middle" }} /> Drag images to reorder. Click the star to set as main image.
                  </p>
                </div>
              </div>

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
                          <button type="button" className="edit-link-remove" onClick={() => removeSocialLink(idx)}>
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
            <button type="button" className="btn btn-primary" onClick={saveProject} disabled={saveStatus === "saving"}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
