import { useEffect } from "react";
import { Search, Plus } from "lucide-react";
import type { TableResponse } from "../store/adminStore";
import { useAdminStore } from "../store/adminStore";
import { DataTable, formatRole } from "./DataTable";
import { formatAcademicYear, formatContext } from "../utils";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface TableStatusMessagesProps {
  status: LoadStatus;
  hasRows: boolean;
  hasFilteredRows: boolean;
}

function TableStatusMessages({ status, hasRows, hasFilteredRows }: TableStatusMessagesProps): React.ReactNode {
  if (status === "loading") {
    return <p className="admin-list-message">Loading data…</p>;
  }
  if (status === "error") {
    return <p className="admin-list-message error-message">Failed to load data.</p>;
  }
  if (status === "ready" && !hasRows) {
    return <p className="admin-list-message">No rows found.</p>;
  }
  if (status === "ready" && hasRows && !hasFilteredRows) {
    return <p className="admin-list-message">No matches found.</p>;
  }
  return null;
}

function extractUniqueValues(rows: TableResponse["rows"], key: string): string[] {
  return [...new Set(rows.map((r) => String(r[key] || "")).filter(Boolean))];
}

function AdminProjectsHeader(): React.ReactNode {
  const tableData = useAdminStore((s) => s.tableData);
  const selectedYear = useAdminStore((s) => s.selectedYear);
  const selectedContext = useAdminStore((s) => s.selectedContext);
  const searchQuery = useAdminStore((s) => s.searchQuery);
  const searchExpanded = useAdminStore((s) => s.searchExpanded);
  const setSelectedYear = useAdminStore((s) => s.setSelectedYear);
  const setSelectedContext = useAdminStore((s) => s.setSelectedContext);
  const setSearchQuery = useAdminStore((s) => s.setSearchQuery);
  const setSearchExpanded = useAdminStore((s) => s.setSearchExpanded);

  const isProjectsData = tableData?.table === "projects";
  const allYears = isProjectsData
    ? extractUniqueValues(tableData.rows, "academic_year").sort().reverse()
    : [];
  const allContexts = isProjectsData
    ? extractUniqueValues(tableData.rows, "context").sort()
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

function AdminUsersHeader(): React.ReactNode {
  const openUserModal = useAdminStore((s) => s.openUserModal);

  return (
    <div className="detail-action-group">
      <button type="button" className="detail-action-btn has-label" onClick={openUserModal} title="Add user">
        <Plus size={14} />
        Add
      </button>
    </div>
  );
}

function filterProjects(
  rows: TableResponse["rows"],
  selectedYear: string,
  selectedContext: string,
  searchQuery: string
): TableResponse["rows"] {
  const searchLower = searchQuery.toLowerCase();

  return rows.filter((row) => {
    if (selectedYear && String(row.academic_year) !== selectedYear) return false;
    if (selectedContext && String(row.context) !== selectedContext) return false;
    if (searchQuery) {
      const nameMatch = String(row.student_name || "").toLowerCase().includes(searchLower);
      const titleMatch = String(row.project_title || "").toLowerCase().includes(searchLower);
      if (!nameMatch && !titleMatch) return false;
    }
    return true;
  });
}

const PROJECT_COLUMNS = [
  { key: "student_name", label: "Student name" },
  { key: "project_title", label: "Project title" },
  { key: "context", label: "Context", formatter: formatContext },
  { key: "academic_year", label: "Academic year", formatter: formatAcademicYear },
];

function AdminProjectsTable(): React.ReactNode {
  const tableData = useAdminStore((s) => s.tableData);
  const tableStatus = useAdminStore((s) => s.tableStatus);
  const selectedProjectId = useAdminStore((s) => s.selectedProjectId);
  const selectedYear = useAdminStore((s) => s.selectedYear);
  const selectedContext = useAdminStore((s) => s.selectedContext);
  const searchQuery = useAdminStore((s) => s.searchQuery);
  const selectProject = useAdminStore((s) => s.selectProject);
  const openEditForProject = useAdminStore((s) => s.openEditForProject);

  const rows = tableData?.table === "projects" ? tableData.rows : [];
  const filteredRows = filterProjects(rows, selectedYear, selectedContext, searchQuery);

  const handleRowClick = (row: Record<string, unknown>): void => {
    if (typeof row.id === "string") {
      selectProject(row.id);
    }
  };

  const handleRowDoubleClick = (row: Record<string, unknown>): void => {
    if (typeof row.id === "string") {
      openEditForProject(row.id);
    }
  };

  return (
    <>
      <TableStatusMessages
        status={tableStatus}
        hasRows={rows.length > 0}
        hasFilteredRows={filteredRows.length > 0}
      />
      {tableStatus === "ready" && filteredRows.length > 0 && (
        <DataTable
          columns={PROJECT_COLUMNS}
          rows={filteredRows}
          activeTable="projects"
          selectedProjectId={selectedProjectId}
          onRowClick={handleRowClick}
          onRowDoubleClick={handleRowDoubleClick}
        />
      )}
    </>
  );
}

type ColumnFormatter = (value: unknown, row: Record<string, unknown>) => React.ReactNode;

function buildColumnsFromRow(
  row: Record<string, unknown>,
  formatters: Record<string, ColumnFormatter> = {}
): Array<{ key: string; label: string; formatter?: ColumnFormatter }> {
  return Object.keys(row)
    .slice(0, 4)
    .map((col) => ({
      key: col,
      label: col.replace("_", " "),
      formatter: formatters[col],
    }));
}

interface GenericTableProps {
  activeTable: string;
  formatters?: Record<string, ColumnFormatter>;
}

function GenericTable({ activeTable, formatters = {} }: GenericTableProps): React.ReactNode {
  const tableData = useAdminStore((s) => s.tableData);
  const tableStatus = useAdminStore((s) => s.tableStatus);

  const rows = tableData?.rows ?? [];
  const columns = rows[0] ? buildColumnsFromRow(rows[0], formatters) : [];

  return (
    <>
      <TableStatusMessages status={tableStatus} hasRows={rows.length > 0} hasFilteredRows={rows.length > 0} />
      {tableStatus === "ready" && rows.length > 0 && (
        <DataTable columns={columns} rows={rows} activeTable={activeTable} />
      )}
    </>
  );
}

function AdminProjectImagesTable(): React.ReactNode {
  return <GenericTable activeTable="project_images" />;
}

function AdminUsersTable(): React.ReactNode {
  return <GenericTable activeTable="users" formatters={{ role: formatRole }} />;
}

function renderTableHeader(activeTable: string): React.ReactNode {
  if (activeTable === "projects") return <AdminProjectsHeader />;
  if (activeTable === "users") return <AdminUsersHeader />;
  return null;
}

function renderTableContent(activeTable: string): React.ReactNode {
  if (activeTable === "projects") return <AdminProjectsTable />;
  if (activeTable === "project_images") return <AdminProjectImagesTable />;
  if (activeTable === "users") return <AdminUsersTable />;
  return null;
}

export function AdminListView(): React.ReactNode {
  const activeTable = useAdminStore((s) => s.activeTable);

  return (
    <div className="admin-list">
      <div className="admin-list-header">
        <h2>{activeTable.replace("_", " ")}</h2>
        {renderTableHeader(activeTable)}
      </div>
      {renderTableContent(activeTable)}
    </div>
  );
}
