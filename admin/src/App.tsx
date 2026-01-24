import { useEffect } from "react";
import { useAdminStore } from "./store/adminStore";
import { AdminHeader } from "./components/AdminHeader";
import { AdminTabs } from "./components/AdminTabs";
import { AdminListView } from "./components/AdminListView";
import { ProjectDetailPanel } from "./components/ProjectDetailPanel";
import { UserDetailPanel } from "./components/UserDetailPanel";
import { EditProjectModal } from "./components/EditProjectModal";
import { CreateUserModal } from "./components/CreateUserModal";

export default function App() {
  const { status, tables, darkMode, activeTable, loadSession } = useAdminStore((state) => ({
    status: state.status,
    tables: state.tables,
    darkMode: state.darkMode,
    activeTable: state.activeTable,
    loadSession: state.loadSession,
  }));

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("admin-dark-mode", String(darkMode));
  }, [darkMode]);

  return (
    <div className="admin-shell">
      <AdminHeader />

      {status === "loading" && <p>Loading your session…</p>}
      {status === "error" && <p className="error-message">Unable to load your session.</p>}

      {status === "ready" && tables.length > 0 && (
        <div className="admin-panel">
          <AdminTabs />
          <div className="admin-split">
            <AdminListView />
            {activeTable === "users" ? <UserDetailPanel /> : <ProjectDetailPanel />}
          </div>
        </div>
      )}

      <EditProjectModal />
      <CreateUserModal />
    </div>
  );
}
