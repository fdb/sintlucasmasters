import { useEffect } from "react";
import { useAdminStore } from "./store/adminStore";
import { AdminHeader } from "./components/AdminHeader";
import { AdminTabs } from "./components/AdminTabs";
import { AdminListView } from "./components/AdminListView";
import { ProjectDetailPanel } from "./components/ProjectDetailPanel";
import { EditProjectModal } from "./components/EditProjectModal";

export default function App() {
  const { status, tables, darkMode, loadSession } = useAdminStore((state) => ({
    status: state.status,
    tables: state.tables,
    darkMode: state.darkMode,
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
            <ProjectDetailPanel />
          </div>
        </div>
      )}

      <EditProjectModal />
    </div>
  );
}
