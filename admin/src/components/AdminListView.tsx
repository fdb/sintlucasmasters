import { useEffect, useRef } from "react";
import { Search, Plus } from "lucide-react";
import type { TableResponse } from "../store/adminStore";
import { useAdminStore } from "../store/adminStore";
import { useTable } from "../api/queries";
import { DataTable, formatRole } from "./DataTable";
import { formatAcademicYear, formatContext, PROGRAM_LABELS } from "../utils";

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
  // Error state is handled by ConnectionStatusBanner - don't show inline error
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

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "ready_for_print", label: "Ready for print" },
  { value: "published", label: "Published" },
];

function AdminProjectsHeader(): React.ReactNode {
  const { data: tableData } = useTable("projects");

  const selectedYear = useAdminStore((s) => s.selectedYear);
  const selectedContext = useAdminStore((s) => s.selectedContext);
  const selectedProgram = useAdminStore((s) => s.selectedProgram);
  const selectedStatus = useAdminStore((s) => s.selectedStatus);
  const searchQuery = useAdminStore((s) => s.searchQuery);
  const searchExpanded = useAdminStore((s) => s.searchExpanded);
  const setSelectedYear = useAdminStore((s) => s.setSelectedYear);
  const setSelectedContext = useAdminStore((s) => s.setSelectedContext);
  const setSelectedProgram = useAdminStore((s) => s.setSelectedProgram);
  const setSelectedStatus = useAdminStore((s) => s.setSelectedStatus);
  const setSearchQuery = useAdminStore((s) => s.setSearchQuery);
  const setSearchExpanded = useAdminStore((s) => s.setSearchExpanded);

  const isProjectsData = tableData?.table === "projects";
  const allYears = isProjectsData ? extractUniqueValues(tableData.rows, "academic_year").sort().reverse() : [];
  const allContexts = isProjectsData ? extractUniqueValues(tableData.rows, "context").sort() : [];
  const defaultYear = allYears[0] || "";
  const didAutoSelectYear = useRef(false);

  useEffect(() => {
    if (!isProjectsData) return;
    if (selectedYear) {
      didAutoSelectYear.current = true;
      return;
    }
    if (defaultYear && !didAutoSelectYear.current) {
      didAutoSelectYear.current = true;
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
      <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)} className="filter-select">
        <option value="">All programmes</option>
        {Object.entries(PROGRAM_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
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
      <div className="status-filter" role="group" aria-label="Status filter">
        {STATUS_FILTERS.map((status) => {
          const isActive = selectedStatus === status.value;
          const statusClass = status.value ? status.value : "all";
          return (
            <button
              key={status.value || "all"}
              type="button"
              className={`status-filter-dot ${isActive ? "active" : ""}`}
              onClick={() => setSelectedStatus(status.value)}
              aria-pressed={isActive}
              aria-label={status.label}
              data-tooltip={status.label}
            >
              <span className={`status-dot status-${statusClass}`} aria-hidden="true" />
              <span className="sr-only">{status.label}</span>
            </button>
          );
        })}
      </div>
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
  selectedProgram: string,
  selectedStatus: string,
  searchQuery: string
): TableResponse["rows"] {
  const searchLower = searchQuery.toLowerCase();

  return rows.filter((row) => {
    if (selectedYear && String(row.academic_year) !== selectedYear) return false;
    if (selectedContext && String(row.context) !== selectedContext) return false;
    if (selectedProgram && String(row.program) !== selectedProgram) return false;
    if (selectedStatus) {
      const rowStatus = String(row.status || "draft")
        .toLowerCase()
        .replace(/\s+/g, "_");
      if (rowStatus !== selectedStatus) return false;
    }
    if (searchQuery) {
      const nameMatch = String(row.student_name || "")
        .toLowerCase()
        .includes(searchLower);
      const titleMatch = String(row.project_title || "")
        .toLowerCase()
        .includes(searchLower);
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

const USERS_COLUMNS = [
  { key: "email", label: "Email" },
  { key: "name", label: "Name" },
  { key: "role", label: "Role", formatter: formatRole },
];

function AdminProjectsTable(): React.ReactNode {
  const { data: tableData, isLoading, isError } = useTable("projects");
  const tableStatus: LoadStatus = isLoading ? "loading" : isError ? "error" : tableData ? "ready" : "idle";

  const selectedProjectId = useAdminStore((s) => s.selectedProjectId);
  const selectedYear = useAdminStore((s) => s.selectedYear);
  const selectedContext = useAdminStore((s) => s.selectedContext);
  const selectedProgram = useAdminStore((s) => s.selectedProgram);
  const selectedStatus = useAdminStore((s) => s.selectedStatus);
  const searchQuery = useAdminStore((s) => s.searchQuery);
  const selectProject = useAdminStore((s) => s.selectProject);
  const openEditForProject = useAdminStore((s) => s.openEditForProject);

  const rows = tableData?.table === "projects" ? tableData.rows : [];
  const filteredRows = filterProjects(
    rows,
    selectedYear,
    selectedContext,
    selectedProgram,
    selectedStatus,
    searchQuery
  );

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
      <TableStatusMessages status={tableStatus} hasRows={rows.length > 0} hasFilteredRows={filteredRows.length > 0} />
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

function AdminUsersTable(): React.ReactNode {
  const { data: tableData, isLoading, isError } = useTable("users");
  const tableStatus: LoadStatus = isLoading ? "loading" : isError ? "error" : tableData ? "ready" : "idle";

  const selectedUserId = useAdminStore((s) => s.selectedUserId);
  const selectUser = useAdminStore((s) => s.selectUser);

  const rows = tableData?.table === "users" ? tableData.rows : [];

  const handleRowClick = (row: Record<string, unknown>): void => {
    if (typeof row.id === "string") {
      selectUser(row.id);
    }
  };

  return (
    <>
      <TableStatusMessages status={tableStatus} hasRows={rows.length > 0} hasFilteredRows={rows.length > 0} />
      {tableStatus === "ready" && rows.length > 0 && (
        <DataTable
          columns={USERS_COLUMNS}
          rows={rows}
          activeTable="users"
          selectedRowId={selectedUserId}
          onRowClick={handleRowClick}
        />
      )}
    </>
  );
}

function renderTableHeader(activeTable: string): React.ReactNode {
  if (activeTable === "projects") return <AdminProjectsHeader />;
  if (activeTable === "users") return <AdminUsersHeader />;
  return null;
}

function renderTableContent(activeTable: string): React.ReactNode {
  if (activeTable === "projects") return <AdminProjectsTable />;
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
