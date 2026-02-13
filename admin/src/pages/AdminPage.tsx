import { useEffect } from "react";
import { useShallow } from "zustand/shallow";
import { useAdminStore } from "../store/adminStore";
import { useSession } from "../api/queries";
import { AdminHeader } from "../components/AdminHeader";
import { AdminTabs } from "../components/AdminTabs";
import { AdminListView } from "../components/AdminListView";
import { ProjectDetailPanel } from "../components/ProjectDetailPanel";
import { UserDetailPanel } from "../components/UserDetailPanel";
import { EditProjectModal } from "../components/EditProjectModal";
import { CreateUserModal } from "../components/CreateUserModal";
import { ConnectionStatusBanner } from "../components/ConnectionStatusBanner";

export function AdminPage() {
  const { activeTable, setActiveTable } = useAdminStore(
    useShallow((state) => ({
      activeTable: state.activeTable,
      setActiveTable: state.setActiveTable,
    }))
  );

  const { data: session, isLoading, isError } = useSession();
  const tables = session?.tables ?? [];

  // Set default active table when session loads
  useEffect(() => {
    if (!isLoading && !isError && tables.length > 0 && !activeTable) {
      setActiveTable(tables[0]);
    }
  }, [isLoading, isError, tables, activeTable, setActiveTable]);

  // Show panel if we have cached data OR if initial load succeeded
  const showPanel = tables.length > 0 || (!isLoading && !isError);

  return (
    <div className="admin-shell">
      <ConnectionStatusBanner />
      <AdminHeader />

      {isLoading && !tables.length && <p>Loading your session...</p>}

      {showPanel && tables.length > 0 && (
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
