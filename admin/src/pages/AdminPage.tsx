import { useAdminStore } from "../store/adminStore";
import { AdminHeader } from "../components/AdminHeader";
import { AdminTabs } from "../components/AdminTabs";
import { AdminListView } from "../components/AdminListView";
import { ProjectDetailPanel } from "../components/ProjectDetailPanel";
import { UserDetailPanel } from "../components/UserDetailPanel";
import { EditProjectModal } from "../components/EditProjectModal";
import { CreateUserModal } from "../components/CreateUserModal";

export function AdminPage() {
  const { status, tables, activeTable } = useAdminStore((state) => ({
    status: state.status,
    tables: state.tables,
    activeTable: state.activeTable,
  }));

  return (
    <div className="admin-shell">
      <AdminHeader />

      {status === "loading" && <p>Loading your session...</p>}
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
