import { useShallow } from "zustand/shallow";
import { useAdminStore } from "../store/adminStore";

const TABLES = ["projects", "users"] as const;

export function AdminTabs() {
  const { activeTable, setActiveTable } = useAdminStore(
    useShallow((state) => ({
      activeTable: state.activeTable,
      setActiveTable: state.setActiveTable,
    }))
  );

  return (
    <nav className="admin-tabs">
      {TABLES.map((table) => (
        <button
          key={table}
          type="button"
          className={table === activeTable ? "active" : ""}
          onClick={() => setActiveTable(table)}
        >
          {table.replace("_", " ")}
        </button>
      ))}
    </nav>
  );
}
