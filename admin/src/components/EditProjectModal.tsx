import { useEffect } from "react";
import { X } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import { ProjectEditForm } from "./ProjectEditForm";

export function EditProjectModal() {
  const { editModalOpen, closeEdit, isStudentMode } = useAdminStore((state) => ({
    editModalOpen: state.editModalOpen,
    closeEdit: state.closeEdit,
    isStudentMode: state.isStudentMode,
  }));

  const studentMode = isStudentMode();

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
          {studentMode && <span className="student-mode-badge">Student View</span>}
          <button type="button" className="edit-modal-close" onClick={closeEdit}>
            <X size={18} />
          </button>
        </div>

        <div className="edit-modal-body">
          <ProjectEditForm showFooter={false} />
        </div>

        <div className="edit-modal-footer">
          <ProjectEditFormFooter onCancel={closeEdit} />
        </div>
      </div>
    </div>
  );
}

function ProjectEditFormFooter({ onCancel }: { onCancel: () => void }) {
  const { saveStatus, saveProject, canEditProject } = useAdminStore((state) => ({
    saveStatus: state.saveStatus,
    saveProject: state.saveProject,
    canEditProject: state.canEditProject,
  }));

  const editCheck = canEditProject();
  const isLocked = !editCheck.allowed;

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
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void saveProject()}
            disabled={saveStatus === "saving"}
          >
            Save Changes
          </button>
        )}
      </div>
    </>
  );
}
