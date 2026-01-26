import { useEffect } from "react";
import { useAdminStore } from "../store/adminStore";
import { StudentHeader } from "../components/StudentHeader";
import { ProjectDetailPanel } from "../components/ProjectDetailPanel";
import { EditProjectModal } from "../components/EditProjectModal";

export function StudentPage() {
  const { status, studentProjectsStatus, loadStudentProjects, impersonatedUser, user } = useAdminStore((state) => ({
    status: state.status,
    studentProjectsStatus: state.studentProjectsStatus,
    loadStudentProjects: state.loadStudentProjects,
    impersonatedUser: state.impersonatedUser,
    user: state.user,
  }));

  // Load student projects when session is ready or impersonated user changes
  useEffect(() => {
    if (status === "ready") {
      // Determine which user's projects to load
      const targetUserId = impersonatedUser?.id ?? user?.id;
      if (targetUserId) {
        loadStudentProjects(targetUserId);
      }
    }
  }, [status, impersonatedUser?.id, user?.id, loadStudentProjects]);

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
        <div className="student-content">
          <ProjectDetailPanel />
        </div>
      )}

      <EditProjectModal />
    </div>
  );
}
