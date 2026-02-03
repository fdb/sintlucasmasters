import { useEffect } from "react";
import { useAdminStore } from "../store/adminStore";
import { useSession } from "../api/queries";
import { AdminHeader } from "../components/AdminHeader";
import { AdminTabs } from "../components/AdminTabs";
import { AdminListView } from "../components/AdminListView";
import { ProjectDetailPanel } from "../components/ProjectDetailPanel";
import { UserDetailPanel } from "../components/UserDetailPanel";
import { EditProjectModal } from "../components/EditProjectModal";
import { CreateUserModal } from "../components/CreateUserModal";

export function AdminPage() {
  const { activeTable, setActiveTable } = useAdminStore((state) => ({
    activeTable: state.activeTable,
    setActiveTable: state.setActiveTable,
  }));

  // Use TanStack Query for session
  const { data: session, isLoading, isError } = useSession();
  const tables = session?.tables ?? [];

  // Set default active table when session loads
  useEffect(() => {
    if (!isLoading && !isError && tables.length > 0 && !activeTable) {
      setActiveTable(tables[0]);
    }
  }, [isLoading, isError, tables, activeTable, setActiveTable]);

  return (
    <div className="admin-shell">
      <AdminHeader />

      {isLoading && <p>Loading your session...</p>}
      {isError && <p className="error-message">Unable to load your session.</p>}

      {!isLoading && !isError && tables.length > 0 && (
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
