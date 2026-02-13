import { useEffect } from "react";
import { useShallow } from "zustand/shallow";
import { useAdminStore } from "../store/adminStore";
import { useSession, useStudentProjects } from "../api/queries";
import { StudentHeader } from "../components/StudentHeader";
import { ProjectEditForm } from "../components/ProjectEditForm";
import { StudentPreviewPanel } from "../components/StudentPreviewPanel";

export function StudentPage() {
  const { impersonatedUser, selectedProjectId, openEditForProject, editDraft, setSelectedProjectId } = useAdminStore(
    useShallow((state) => ({
      impersonatedUser: state.impersonatedUser,
      selectedProjectId: state.selectedProjectId,
      openEditForProject: state.openEditForProject,
      editDraft: state.editDraft,
      setSelectedProjectId: state.setSelectedProjectId,
    }))
  );

  const { data: session } = useSession();
  const user = session?.user ?? null;

  const targetUserId = impersonatedUser?.id ?? user?.id ?? null;

  const { data: studentProjects, isLoading, isError } = useStudentProjects(targetUserId);
  const studentProjectsStatus = isLoading ? "loading" : isError ? "error" : studentProjects ? "ready" : "idle";

  // Auto-select first project when projects load
  useEffect(() => {
    if (studentProjects && studentProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(studentProjects[0].id);
    }
  }, [studentProjects, selectedProjectId, setSelectedProjectId]);

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
