import { useEffect } from "react";
import { useAdminStore } from "./store/adminStore";
import { AdminPage } from "./pages/AdminPage";
import { StudentPage } from "./pages/StudentPage";

export default function App() {
  const { darkMode, user, impersonatedUser, status, loadSession } = useAdminStore((state) => ({
    darkMode: state.darkMode,
    user: state.user,
    impersonatedUser: state.impersonatedUser,
    status: state.status,
    loadSession: state.loadSession,
  }));

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("admin-dark-mode", String(darkMode));
  }, [darkMode]);

  // Determine which view to show based on role and impersonation
  const isAdmin = user?.role === "admin" || user?.role === "editor";
  const isImpersonating = !!impersonatedUser;
  const isStudent = user?.role === "student";

  // Show student view if:
  // 1. User is a student (not admin/editor)
  // 2. Admin is impersonating a student
  const showStudentView = (isStudent && !isAdmin) || isImpersonating;

  // While loading, we don't know the role yet - show nothing to avoid flicker
  if (status === "loading") {
    return (
      <div className="admin-shell">
        <p>Loading your session...</p>
      </div>
    );
  }

  if (showStudentView) {
    return <StudentPage />;
  }

  return <AdminPage />;
}
