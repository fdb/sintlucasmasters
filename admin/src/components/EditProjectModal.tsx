import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminStore } from "../store/adminStore";
import { ProjectEditForm } from "./ProjectEditForm";
import { LanguageTabs } from "./LanguageTabs";
import { queryKeys } from "../api/queryKeys";

export function EditProjectModal() {
  const { editModalOpen, closeEdit, isStudentMode } = useAdminStore((state) => ({
    editModalOpen: state.editModalOpen,
    closeEdit: state.closeEdit,
    isStudentMode: state.isStudentMode,
  }));
  const [autosaveNotice, setAutosaveNotice] = useState<"saved" | "error" | null>(null);

  const studentMode = isStudentMode();
  const autosaveIndicator = autosaveNotice ? (
    <span className={`save-indicator ${autosaveNotice} header-save-indicator`} aria-live="polite" aria-atomic="true">
      <span className="save-indicator-dot" aria-hidden="true" />
      {autosaveNotice === "saved" ? "Saved" : "Save failed. Retrying..."}
    </span>
  ) : null;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editModalOpen) {
        closeEdit();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [editModalOpen, closeEdit]);

  useEffect(() => {
    if (!editModalOpen) {
      setAutosaveNotice(null);
    }
  }, [editModalOpen]);

  return (
    <div className={`edit-modal-overlay ${editModalOpen ? "is-open" : ""}`} onClick={closeEdit}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal-header">
          <div className="edit-modal-header-left">
            <h2>Edit Project</h2>
            {studentMode && <span className="student-mode-badge">Student View</span>}
          </div>
          <div className="edit-modal-header-right">
            <div className="language-tabs-stack">
              {autosaveIndicator}
              <LanguageTabs className="language-tabs-top language-tabs-modal" />
            </div>
            <button type="button" className="edit-modal-close" onClick={closeEdit}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="edit-modal-body">
          <ProjectEditForm showFooter={false} onAutosaveNoticeChange={setAutosaveNotice} />
        </div>

        <div className="edit-modal-footer">
          <ProjectEditFormFooter onCancel={closeEdit} />
        </div>
      </div>
    </div>
  );
}

function ProjectEditFormFooter({ onCancel }: { onCancel: () => void }) {
  const queryClient = useQueryClient();
  const { saveStatus, saveProject, canEditProject } = useAdminStore((state) => ({
    saveStatus: state.saveStatus,
    saveProject: state.saveProject,
    canEditProject: state.canEditProject,
  }));

  const editCheck = canEditProject();
  const isLocked = !editCheck.allowed;

  const handleSave = () => {
    void saveProject({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.table("projects") });
      },
    });
  };

  return (
    <>
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
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {isLocked ? "Close" : "Cancel"}
        </button>
        {!isLocked && (
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saveStatus === "saving"}>
            Save Changes
          </button>
        )}
      </div>
    </>
  );
}
