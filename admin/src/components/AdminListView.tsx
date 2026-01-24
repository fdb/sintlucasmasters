import { useEffect } from "react";
import { Search, Plus } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import { DataTable, formatRole } from "./DataTable";
import { formatAcademicYear, formatContext } from "../utils";

function AdminProjectsHeader() {
  const {
    tableData,
    selectedYear,
    selectedContext,
    searchQuery,
    searchExpanded,
    setSelectedYear,
    setSelectedContext,
    setSearchQuery,
    setSearchExpanded,
  } = useAdminStore((state) => ({
    tableData: state.tableData,
    selectedYear: state.selectedYear,
    selectedContext: state.selectedContext,
    searchQuery: state.searchQuery,
    searchExpanded: state.searchExpanded,
    setSelectedYear: state.setSelectedYear,
    setSelectedContext: state.setSelectedContext,
    setSearchQuery: state.setSearchQuery,
    setSearchExpanded: state.setSearchExpanded,
  }));

  const isProjectsData = tableData?.table === "projects";
  const allYears = isProjectsData
    ? [...new Set(tableData.rows.map((r) => String(r.academic_year || "")).filter(Boolean))].sort().reverse()
    : [];
  const allContexts = isProjectsData
    ? [...new Set(tableData.rows.map((r) => String(r.context || "")).filter(Boolean))].sort()
    : [];
  const defaultYear = allYears[0] || "";

  useEffect(() => {
    if (isProjectsData && defaultYear && !selectedYear) {
      setSelectedYear(defaultYear);
    }
  }, [defaultYear, isProjectsData, selectedYear, setSelectedYear]);

  if (!isProjectsData) return null;

  return (
    <div className="admin-filters">
      <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="filter-select">
        <option value="">All years</option>
        {allYears.map((year) => (
          <option key={year} value={year}>
            {formatAcademicYear(year)}
          </option>
        ))}
      </select>
      <select value={selectedContext} onChange={(e) => setSelectedContext(e.target.value)} className="filter-select">
        <option value="">All contexts</option>
        {allContexts.map((ctx) => (
          <option key={ctx} value={ctx}>
            {formatContext(ctx)}
          </option>
        ))}
      </select>
      <div className={`search-container ${searchExpanded ? "expanded" : ""}`}>
        {searchExpanded ? (
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="search-input"
            autoFocus
            onBlur={() => {
              if (!searchQuery) setSearchExpanded(false);
            }}
          />
        ) : (
          <button type="button" className="search-toggle" onClick={() => setSearchExpanded(true)} title="Search">
            <Search size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function AdminUsersHeader() {
  const { openUserModal } = useAdminStore((state) => ({
    openUserModal: state.openUserModal,
  }));

  return (
    <div className="detail-action-group">
      <button type="button" className="detail-action-btn has-label" onClick={openUserModal} title="Add user">
        <Plus size={14} />
        Add
      </button>
    </div>
  );
}

function AdminProjectsTable() {
  const {
    tableData,
    tableStatus,
    selectedProjectId,
    selectedYear,
    selectedContext,
    searchQuery,
    selectProject,
    openEditForProject,
  } = useAdminStore((state) => ({
    tableData: state.tableData,
    tableStatus: state.tableStatus,
    selectedProjectId: state.selectedProjectId,
    selectedYear: state.selectedYear,
    selectedContext: state.selectedContext,
    searchQuery: state.searchQuery,
    selectProject: state.selectProject,
    openEditForProject: state.openEditForProject,
  }));

  const filteredRows = tableData?.table === "projects"
    ? tableData.rows.filter((row) => {
        const yearMatch = !selectedYear || String(row.academic_year) === selectedYear;
        const contextMatch = !selectedContext || String(row.context) === selectedContext;
        const searchLower = searchQuery.toLowerCase();
        const searchMatch =
          !searchQuery ||
          String(row.student_name || "")
            .toLowerCase()
            .includes(searchLower) ||
          String(row.project_title || "")
            .toLowerCase()
            .includes(searchLower);
        return yearMatch && contextMatch && searchMatch;
      })
    : [];

  const columns = [
    { key: "student_name", label: "Student name" },
    { key: "project_title", label: "Project title" },
    { key: "context", label: "Context", formatter: formatContext },
    { key: "academic_year", label: "Academic year", formatter: formatAcademicYear },
  ];

  return (
    <>
      {tableStatus === "loading" && <p className="admin-list-message">Loading data…</p>}
      {tableStatus === "error" && <p className="admin-list-message error-message">Failed to load data.</p>}
      {tableStatus === "ready" && (!tableData || tableData.rows.length === 0) && (
        <p className="admin-list-message">No rows found.</p>
      )}

      {tableStatus === "ready" && tableData && filteredRows.length > 0 && (
        <DataTable
          columns={columns}
          rows={filteredRows}
          activeTable="projects"
          selectedProjectId={selectedProjectId}
          onRowClick={(row) => {
            if (typeof row.id !== "string") return;
            selectProject(row.id);
          }}
          onRowDoubleClick={(row) => {
            if (typeof row.id !== "string") return;
            openEditForProject(row.id);
          }}
        />
      )}
      {tableStatus === "ready" && tableData && tableData.rows.length > 0 && filteredRows.length === 0 && (
        <p className="admin-list-message">No matches found.</p>
      )}
    </>
  );
}

function AdminProjectImagesTable() {
  const { tableData, tableStatus } = useAdminStore((state) => ({
    tableData: state.tableData,
    tableStatus: state.tableStatus,
  }));

  const columns = tableData?.rows[0]
    ? Object.keys(tableData.rows[0])
        .slice(0, 4)
        .map((col) => ({
          key: col,
          label: col.replace("_", " "),
        }))
    : [];

  return (
    <>
      {tableStatus === "loading" && <p className="admin-list-message">Loading data…</p>}
      {tableStatus === "error" && <p className="admin-list-message error-message">Failed to load data.</p>}
      {tableStatus === "ready" && (!tableData || tableData.rows.length === 0) && (
        <p className="admin-list-message">No rows found.</p>
      )}
      {tableStatus === "ready" && tableData && tableData.rows.length > 0 && (
        <DataTable columns={columns} rows={tableData.rows} activeTable="project_images" />
      )}
    </>
  );
}

function AdminUsersTable() {
  const { tableData, tableStatus } = useAdminStore((state) => ({
    tableData: state.tableData,
    tableStatus: state.tableStatus,
  }));

  const columns = tableData?.rows[0]
    ? Object.keys(tableData.rows[0])
        .slice(0, 4)
        .map((col) => ({
          key: col,
          label: col.replace("_", " "),
          formatter: col === "role" ? formatRole : undefined,
        }))
    : [];

  return (
    <>
      {tableStatus === "loading" && <p className="admin-list-message">Loading data…</p>}
      {tableStatus === "error" && <p className="admin-list-message error-message">Failed to load data.</p>}
      {tableStatus === "ready" && (!tableData || tableData.rows.length === 0) && (
        <p className="admin-list-message">No rows found.</p>
      )}
      {tableStatus === "ready" && tableData && tableData.rows.length > 0 && (
        <DataTable columns={columns} rows={tableData.rows} activeTable="users" />
      )}
    </>
  );
}

export function AdminListView() {
  const { activeTable } = useAdminStore((state) => ({
    activeTable: state.activeTable,
  }));

  return (
    <div className="admin-list">
      <div className="admin-list-header">
        <h2>{activeTable.replace("_", " ")}</h2>
        {activeTable === "projects" && <AdminProjectsHeader />}
        {activeTable === "users" && <AdminUsersHeader />}
      </div>

      {activeTable === "projects" && <AdminProjectsTable />}
      {activeTable === "project_images" && <AdminProjectImagesTable />}
      {activeTable === "users" && <AdminUsersTable />}
    </div>
  );
}
