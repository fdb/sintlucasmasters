import { Sun, Moon, LogOut, Eye, X, ChevronDown } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import { useSession, useStudentProjects } from "../api/queries";

export function StudentHeader() {
  const { darkMode, toggleDarkMode, impersonatedUser, setImpersonatedUser, selectedProjectId, setSelectedProjectId } =
    useAdminStore((state) => ({
      darkMode: state.darkMode,
      toggleDarkMode: state.toggleDarkMode,
      impersonatedUser: state.impersonatedUser,
      setImpersonatedUser: state.setImpersonatedUser,
      selectedProjectId: state.selectedProjectId,
      setSelectedProjectId: state.setSelectedProjectId,
    }));

  const { data: session } = useSession();
  const user = session?.user ?? null;

  const targetUserId = impersonatedUser?.id ?? user?.id ?? null;
  const { data: studentProjects = [] } = useStudentProjects(targetUserId);

  const displayName = impersonatedUser?.name || impersonatedUser?.email || user?.name || user?.email || "Student";
  const isImpersonating = !!impersonatedUser;
  const hasMultipleProjects = studentProjects.length > 1;

  const handleStopImpersonation = () => {
    setImpersonatedUser(null);
    // App.tsx will re-render and show AdminPage
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/auth/login";
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = e.target.value;
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  };

  const selectedProject = studentProjects.find((p) => p.id === selectedProjectId);

  return (
    <>
      {isImpersonating && (
        <div className="impersonation-banner">
          <Eye size={14} />
          <span>
            Viewing as <strong>{displayName}</strong>
          </span>
          <button type="button" onClick={handleStopImpersonation} title="Stop viewing and return to admin">
            <X size={14} />
          </button>
        </div>
      )}
      <header className="student-header">
        <div className="student-header-left">
          <h1>{displayName}</h1>
          {hasMultipleProjects && (
            <div className="project-selector">
              <select value={selectedProjectId || ""} onChange={handleProjectChange}>
                {studentProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.academic_year} - {project.project_title || "Untitled Project"}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="select-icon" />
            </div>
          )}
          {!hasMultipleProjects && selectedProject && (
            <p className="student-header-subtitle">
              {selectedProject.academic_year} - {selectedProject.context}
            </p>
          )}
        </div>
        <div className="student-header-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleDarkMode}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {!isImpersonating && (
            <button type="button" className="logout-btn" onClick={handleLogout} title="Log out">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </header>
    </>
  );
}
