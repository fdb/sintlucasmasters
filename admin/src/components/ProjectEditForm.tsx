import { useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, Plus, Trash2, X, Lock } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import { EditImagesGrid } from "./EditImagesGrid";
import { PrintImageSection } from "./PrintImageSection";

const CONTEXTS = [
  "Autonomous Context",
  "Applied Context",
  "Digital Context",
  "Socio-Political Context",
  "Jewelry Context",
];

const PROGRAMS = ["BA_FO", "BA_BK", "MA_BK", "PREMA_BK"];

const STATUSES = ["draft", "submitted", "ready_for_print", "published"];
const AUTOSAVE_DELAY_MS = 1000;
const AUTOSAVE_BACKOFF_BASE_MS = 2000;
const AUTOSAVE_BACKOFF_MAX_MS = 30000;
const AUTOSAVE_RETRY_WHILE_SAVING_MS = 500;
const AUTOSAVE_NOTICE_MS = 2500;

type ProjectEditFormProps = {
  showHeader?: boolean;
  showFooter?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
};

export function ProjectEditForm({ showHeader = false, showFooter = true, onSave, onCancel }: ProjectEditFormProps) {
  const {
    editDraft,
    editImages,
    saveStatus,
    newTag,
    updateEditField,
    setNewTag,
    addTag,
    removeTag,
    addSocialLink,
    updateSocialLink,
    removeSocialLink,
    saveProject,
    isStudentMode,
    canEditProject,
    selectedProjectId,
  } = useAdminStore((state) => ({
    editDraft: state.editDraft,
    editImages: state.editImages,
    saveStatus: state.saveStatus,
    newTag: state.newTag,
    updateEditField: state.updateEditField,
    setNewTag: state.setNewTag,
    addTag: state.addTag,
    removeTag: state.removeTag,
    addSocialLink: state.addSocialLink,
    updateSocialLink: state.updateSocialLink,
    removeSocialLink: state.removeSocialLink,
    saveProject: state.saveProject,
    isStudentMode: state.isStudentMode,
    canEditProject: state.canEditProject,
    selectedProjectId: state.selectedProjectId,
  }));

  const studentMode = isStudentMode();
  const editCheck = canEditProject();
  const isLocked = !editCheck.allowed;

  const autosaveEnabled = studentMode && !isLocked;
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveRetryTimerRef = useRef<number | null>(null);
  const autosaveNoticeTimerRef = useRef<number | null>(null);
  const lastSavedKeyRef = useRef<string | null>(null);
  const lastProjectIdRef = useRef<string | null>(null);
  const pendingAutosaveRef = useRef(false);
  const autosaveBackoffRef = useRef(0);
  const latestAutosaveKeyRef = useRef<string>("");
  const saveStatusRef = useRef(saveStatus);
  const [autosaveNotice, setAutosaveNotice] = useState<"saved" | "error" | null>(null);

  const autosaveKey = useMemo(() => {
    if (!autosaveEnabled || !editDraft) return "";
    return JSON.stringify({
      draft: editDraft,
      images: editImages.map((img) => ({
        id: img.id,
        sort_order: img.sort_order,
        caption: img.caption,
        type: img.type,
        cloudflare_id: img.cloudflare_id,
      })),
    });
  }, [autosaveEnabled, editDraft, editImages]);

  useEffect(() => {
    latestAutosaveKeyRef.current = autosaveKey;
  }, [autosaveKey]);

  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  useEffect(() => {
    if (!autosaveEnabled || !editDraft || !selectedProjectId) return;

    if (lastSavedKeyRef.current === null || lastProjectIdRef.current !== selectedProjectId) {
      lastSavedKeyRef.current = autosaveKey;
      lastProjectIdRef.current = selectedProjectId;
      pendingAutosaveRef.current = false;
      autosaveBackoffRef.current = 0;
      if (autosaveNoticeTimerRef.current) {
        window.clearTimeout(autosaveNoticeTimerRef.current);
      }
      setAutosaveNotice(null);
      return;
    }

    if (autosaveKey === lastSavedKeyRef.current) return;

    pendingAutosaveRef.current = true;
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    if (autosaveRetryTimerRef.current) {
      window.clearTimeout(autosaveRetryTimerRef.current);
    }
    autosaveBackoffRef.current = 0;

    autosaveTimerRef.current = window.setTimeout(async () => {
      const attemptAutosave = async () => {
        if (!pendingAutosaveRef.current || !autosaveEnabled) return;
        if (saveStatusRef.current === "saving") {
          autosaveRetryTimerRef.current = window.setTimeout(attemptAutosave, AUTOSAVE_RETRY_WHILE_SAVING_MS);
          return;
        }
        const keyAtSave = latestAutosaveKeyRef.current;
        const saved = await saveProject({ closeOnSuccess: false });
        if (saved) {
          autosaveBackoffRef.current = 0;
          if (keyAtSave === latestAutosaveKeyRef.current) {
            lastSavedKeyRef.current = keyAtSave;
            pendingAutosaveRef.current = false;
            setAutosaveNotice("saved");
            if (autosaveNoticeTimerRef.current) {
              window.clearTimeout(autosaveNoticeTimerRef.current);
            }
            autosaveNoticeTimerRef.current = window.setTimeout(() => {
              setAutosaveNotice(null);
            }, AUTOSAVE_NOTICE_MS);
          }
          return;
        }
        setAutosaveNotice("error");
        const attempt = autosaveBackoffRef.current;
        const delay = Math.min(AUTOSAVE_BACKOFF_MAX_MS, AUTOSAVE_BACKOFF_BASE_MS * 2 ** attempt);
        autosaveBackoffRef.current = attempt + 1;
        autosaveRetryTimerRef.current = window.setTimeout(attemptAutosave, delay);
      };
      if (!pendingAutosaveRef.current) return;
      await attemptAutosave();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [autosaveEnabled, autosaveKey, editDraft, saveProject, selectedProjectId]);

  useEffect(() => {
    if (!autosaveEnabled) return;
    if (autosaveNotice === "saved" && autosaveKey !== lastSavedKeyRef.current) {
      setAutosaveNotice(null);
    }
  }, [autosaveEnabled, autosaveKey, autosaveNotice]);

  useEffect(() => {
    if (autosaveEnabled) return;
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    if (autosaveRetryTimerRef.current) {
      window.clearTimeout(autosaveRetryTimerRef.current);
    }
    if (autosaveNoticeTimerRef.current) {
      window.clearTimeout(autosaveNoticeTimerRef.current);
    }
    pendingAutosaveRef.current = false;
    autosaveBackoffRef.current = 0;
    setAutosaveNotice(null);
  }, [autosaveEnabled]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
      if (autosaveRetryTimerRef.current) {
        window.clearTimeout(autosaveRetryTimerRef.current);
      }
      if (autosaveNoticeTimerRef.current) {
        window.clearTimeout(autosaveNoticeTimerRef.current);
      }
    };
  }, []);

  const handleSave = async () => {
    const saved = await saveProject({ closeOnSuccess: !studentMode });
    if (saved) {
      lastSavedKeyRef.current = autosaveKey;
      pendingAutosaveRef.current = false;
    }
    onSave?.();
  };

  if (!editDraft) {
    return null;
  }

  const showSaveButton = !studentMode && !isLocked;
  const showCancelButton = Boolean(onCancel);
  const showFooterActions = showSaveButton || showCancelButton;
  const autosaveIndicator =
    autosaveEnabled && autosaveNotice ? (
      <span className={`save-indicator ${autosaveNotice}`}>
        {autosaveNotice === "saved" ? "Saved" : "Save failed. Retrying..."}
      </span>
    ) : null;
  const showAutosaveIndicator = autosaveEnabled && Boolean(autosaveIndicator);

  return (
    <div className="project-edit-form">
      {showAutosaveIndicator && (
        <div className="edit-form-autosave-fixed" aria-live="polite" aria-atomic="true">
          {autosaveIndicator}
        </div>
      )}

      <div className="edit-form-scrollable">
        {showHeader && (
          <div className="edit-form-header">
            <h2>Edit Project</h2>
            {studentMode && <span className="student-mode-badge">Student View</span>}
          </div>
        )}

        {/* Locked project warning */}
        {isLocked && (
          <div className="edit-locked-banner">
            <Lock size={16} />
            <span>{editCheck.reason}</span>
          </div>
        )}

        <div className="edit-sections">
          {/* Section 1: Identity */}
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
                    disabled={isLocked}
                  />
                </div>
                <div className="edit-field">
                  <label className="edit-label">
                    Project Title <span className="required-marker">*</span>
                  </label>
                  <input
                    type="text"
                    className="edit-input"
                    value={editDraft.project_title}
                    onChange={(e) => updateEditField("project_title", e.target.value)}
                    disabled={isLocked}
                  />
                </div>
              </div>
              <div className="edit-row" style={{ marginTop: "1rem" }}>
                <div className="edit-field">
                  <label className="edit-label">Location</label>
                  <input
                    type="text"
                    className="edit-input"
                    value={editDraft.location}
                    onChange={(e) => updateEditField("location", e.target.value)}
                    placeholder="e.g. Antwerp, Belgium"
                    disabled={isLocked}
                  />
                </div>
                <div className="edit-field">
                  <label className="edit-label">Private Email</label>
                  <input
                    type="email"
                    className="edit-input"
                    value={editDraft.private_email}
                    onChange={(e) => updateEditField("private_email", e.target.value)}
                    placeholder="your@email.com"
                    disabled={isLocked}
                  />
                </div>
              </div>
              <div className="edit-field" style={{ marginTop: "1rem" }}>
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
                        disabled={isLocked}
                      />
                      {!isLocked && (
                        <button type="button" className="edit-link-remove" onClick={() => removeSocialLink(idx)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {!isLocked && (
                    <button type="button" className="edit-link-add" onClick={addSocialLink}>
                      <Plus size={12} />
                      Add link
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Classification (restricted for students) */}
          <div className="edit-section">
            <div className="edit-section-header">
              <h3 className="edit-section-title">Classification</h3>
              {studentMode && <span className="read-only-badge">Read-only</span>}
            </div>
            <div className="edit-section-content">
              <div className="edit-row">
                <div className="edit-field">
                  <label className="edit-label">Context</label>
                  <select
                    className="edit-select"
                    value={editDraft.context}
                    onChange={(e) => updateEditField("context", e.target.value)}
                    disabled={studentMode || isLocked}
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
                    disabled={studentMode || isLocked}
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
                    disabled={studentMode || isLocked}
                  />
                </div>
                <div className="edit-field">
                  <label className="edit-label">Status</label>
                  {studentMode ? (
                    <div className="status-display">
                      <span className={`status-badge status-${editDraft.status}`}>
                        {editDraft.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  ) : (
                    <div className="edit-status-row">
                      {STATUSES.map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={`edit-status-option ${editDraft.status === status ? "active" : ""}`}
                          onClick={() => updateEditField("status", status)}
                          disabled={isLocked}
                        >
                          {status.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Print Image (for postcards) */}
          <div className="edit-section">
            <div className="edit-section-header">
              <h3 className="edit-section-title">Print Image</h3>
            </div>
            <div className="edit-section-content">
              <PrintImageSection />
            </div>
          </div>

          {/* Section 4: Content */}
          <div className="edit-section">
            <div className="edit-section-header">
              <h3 className="edit-section-title">Content</h3>
            </div>
            <div className="edit-section-content">
              <div className="edit-field">
                <label className="edit-label">
                  Bio <span className="required-marker">*</span>
                </label>
                <textarea
                  className="edit-textarea"
                  value={editDraft.bio}
                  onChange={(e) => updateEditField("bio", e.target.value)}
                  placeholder="A brief introduction about yourself and your practice..."
                  disabled={isLocked}
                />
              </div>
              <div className="edit-field">
                <label className="edit-label">
                  Project Description <span className="required-marker">*</span>
                </label>
                <textarea
                  className="edit-textarea tall"
                  value={editDraft.description}
                  onChange={(e) => updateEditField("description", e.target.value)}
                  placeholder="Describe the project..."
                  disabled={isLocked}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Media */}
          <div className="edit-section">
            <div className="edit-section-header">
              <h3 className="edit-section-title">Media</h3>
            </div>
            <div className="edit-section-content">
              <EditImagesGrid />
              {!isLocked && (
                <p className="edit-images-hint">
                  <GripVertical size={12} style={{ display: "inline", verticalAlign: "middle" }} /> Drag images to
                  reorder. Click the star to set as main image.
                </p>
              )}
            </div>
          </div>

          {/* Section 6: Tags */}
          <div className="edit-section">
            <div className="edit-section-header">
              <h3 className="edit-section-title">Tags</h3>
            </div>
            <div className="edit-section-content">
              <div className="edit-field">
                <div className="edit-tags">
                  {editDraft.tags.map((tag) => (
                    <span key={tag} className="edit-tag">
                      {tag}
                      {!isLocked && (
                        <button type="button" className="edit-tag-remove" onClick={() => removeTag(tag)}>
                          <X size={10} />
                        </button>
                      )}
                    </span>
                  ))}
                  {!isLocked && (
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
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showFooter && showFooterActions && (
        <div className="edit-form-footer actions-only">
          <div className="edit-form-footer-right">
            {showCancelButton && (
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                {isLocked ? "Close" : "Cancel"}
              </button>
            )}
            {showSaveButton && (
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saveStatus === "saving"}>
                Save Changes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
