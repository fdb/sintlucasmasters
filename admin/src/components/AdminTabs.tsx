import { useAdminStore } from "../store/adminStore";

export function AdminTabs() {
  const { tables, activeTable, setActiveTable } = useAdminStore((state) => ({
    tables: state.tables,
    activeTable: state.activeTable,
    setActiveTable: state.setActiveTable,
  }));

  return (
    <nav className="admin-tabs">
      {tables.map((table) => (
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
