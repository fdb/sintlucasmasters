import { useEffect } from "react";
import { useSession } from "./api/queries";
import { useAdminStore } from "./store/adminStore";
import { AdminPage } from "./pages/AdminPage";
import { StudentPage } from "./pages/StudentPage";

export default function App() {
  const { darkMode, impersonatedUser } = useAdminStore((state) => ({
    darkMode: state.darkMode,
    impersonatedUser: state.impersonatedUser,
  }));

  const { data: session, isLoading } = useSession();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("admin-dark-mode", String(darkMode));
  }, [darkMode]);

  // Get user from query result
  const user = session?.user ?? null;

  // Determine which view to show based on role and impersonation
  const isAdmin = user?.role === "admin" || user?.role === "editor";
  const isImpersonating = !!impersonatedUser;
  const isStudent = user?.role === "student";

  // Show student view if:
  // 1. User is a student (not admin/editor)
  // 2. Admin is impersonating a student
  const showStudentView = (isStudent && !isAdmin) || isImpersonating;

  // While loading, we don't know the role yet - show nothing to avoid flicker
  if (isLoading) {
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
