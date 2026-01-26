import { useEffect } from "react";
import { useAdminStore } from "../store/adminStore";
import { StudentHeader } from "../components/StudentHeader";
import { ProjectEditForm } from "../components/ProjectEditForm";
import { StudentPreviewPanel } from "../components/StudentPreviewPanel";

export function StudentPage() {
  const {
    status,
    studentProjectsStatus,
    loadStudentProjects,
    impersonatedUser,
    user,
    selectedProjectId,
    openEditForProject,
    editDraft,
  } = useAdminStore((state) => ({
    status: state.status,
    studentProjectsStatus: state.studentProjectsStatus,
    loadStudentProjects: state.loadStudentProjects,
    impersonatedUser: state.impersonatedUser,
    user: state.user,
    selectedProjectId: state.selectedProjectId,
    openEditForProject: state.openEditForProject,
    editDraft: state.editDraft,
  }));

  // Load student projects when session is ready or impersonated user changes
  useEffect(() => {
    if (status === "ready") {
      const targetUserId = impersonatedUser?.id ?? user?.id;
      if (targetUserId) {
        loadStudentProjects(targetUserId);
      }
    }
  }, [status, impersonatedUser?.id, user?.id, loadStudentProjects]);

  // Auto-open editing when a project is selected
  useEffect(() => {
    if (selectedProjectId && !editDraft) {
      openEditForProject(selectedProjectId);
    }
  }, [selectedProjectId, editDraft, openEditForProject]);

  return (
    <div className="student-shell">
      <StudentHeader />

      {studentProjectsStatus === "loading" && (
        <div className="student-loading">
          <p>Loading your projects...</p>
        </div>
      )}

      {studentProjectsStatus === "error" && (
        <div className="student-error">
          <p className="error-message">Failed to load your projects.</p>
        </div>
      )}

      {studentProjectsStatus === "ready" && (
        <div className="student-split-view">
          <div className="student-edit-pane">
            <ProjectEditForm showHeader={true} showFooter={true} />
          </div>
          <div className="student-preview-pane">
            <StudentPreviewPanel />
          </div>
        </div>
      )}
    </div>
  );
}
