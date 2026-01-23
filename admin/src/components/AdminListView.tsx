import { useEffect } from "react";
import { Search } from "lucide-react";
import { useAdminStore } from "../store/adminStore";

export function AdminListView() {
  const {
    activeTable,
    tableData,
    tableStatus,
    selectedProjectId,
    selectedYear,
    selectedContext,
    searchQuery,
    searchExpanded,
    setSelectedYear,
    setSelectedContext,
    setSearchQuery,
    setSearchExpanded,
    selectProject,
    openEditForProject,
  } = useAdminStore((state) => ({
    activeTable: state.activeTable,
    tableData: state.tableData,
    tableStatus: state.tableStatus,
    selectedProjectId: state.selectedProjectId,
    selectedYear: state.selectedYear,
    selectedContext: state.selectedContext,
    searchQuery: state.searchQuery,
    searchExpanded: state.searchExpanded,
    setSelectedYear: state.setSelectedYear,
    setSelectedContext: state.setSelectedContext,
    setSearchQuery: state.setSearchQuery,
    setSearchExpanded: state.setSearchExpanded,
    selectProject: state.selectProject,
    openEditForProject: state.openEditForProject,
  }));

  const columns = tableData?.rows[0] ? Object.keys(tableData.rows[0]) : [];
  const isProjectsTable = activeTable === "projects";

  const allYears =
    isProjectsTable && tableData
      ? [...new Set(tableData.rows.map((r) => String(r.academic_year || "")).filter(Boolean))].sort().reverse()
      : [];
  const allContexts =
    isProjectsTable && tableData
      ? [...new Set(tableData.rows.map((r) => String(r.context || "")).filter(Boolean))].sort()
      : [];
  const defaultYear = allYears[0] || "";

  useEffect(() => {
    if (isProjectsTable && defaultYear && !selectedYear) {
      setSelectedYear(defaultYear);
    }
  }, [defaultYear, isProjectsTable, selectedYear, setSelectedYear]);

  const filteredRows =
    isProjectsTable && tableData
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
      : tableData?.rows || [];

  const displayColumns = isProjectsTable
    ? columns.filter((col) => ["student_name", "project_title", "context", "academic_year"].includes(col))
    : columns.slice(0, 4);

  return (
    <div className="admin-list">
      <div className="admin-list-header">
        <h2>{activeTable.replace("_", " ")}</h2>
        {isProjectsTable && tableData && (
          <div className="admin-filters">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="filter-select"
            >
              <option value="">All years</option>
              {allYears.map((year) => (
                <option key={year} value={year}>
                  {formatAcademicYear(year)}
                </option>
              ))}
            </select>
            <select
              value={selectedContext}
              onChange={(e) => setSelectedContext(e.target.value)}
              className="filter-select"
            >
              <option value="">All contexts</option>
              {allContexts.map((ctx) => (
                <option key={ctx} value={ctx}>
                  {ctx.replace(" Context", "")}
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
                <button
                  type="button"
                  className="search-toggle"
                  onClick={() => setSearchExpanded(true)}
                  title="Search"
                >
                  <Search size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {tableStatus === "loading" && <p className="admin-list-message">Loading data…</p>}
      {tableStatus === "error" && <p className="admin-list-message error-message">Failed to load data.</p>}
      {tableStatus === "ready" && (!tableData || tableData.rows.length === 0) && (
        <p className="admin-list-message">No rows found.</p>
      )}

      {tableStatus === "ready" && tableData && filteredRows.length > 0 && (
        <div className="admin-list-scroll">
          <table>
            <thead>
              <tr>
                {displayColumns.map((column) => (
                  <th key={column}>{column.replace("_", " ")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, rowIndex) => {
                const rowId = typeof row.id === "string" ? row.id : null;
                const isSelected = isProjectsTable && rowId === selectedProjectId;
                const rowStatus = String(row.status || "draft").toLowerCase();
                return (
                  <tr
                    key={`${activeTable}-${rowIndex}`}
                    className={`${isProjectsTable ? `row-clickable status-${rowStatus}` : ""} ${
                      isSelected ? "row-selected" : ""
                    }`}
                    onClick={() => {
                      if (!isProjectsTable || !rowId) return;
                      selectProject(rowId);
                    }}
                    onDoubleClick={() => {
                      if (!isProjectsTable || !rowId) return;
                      openEditForProject(rowId);
                    }}
                  >
                    {displayColumns.map((column) => (
                      <td key={column}>
                        {column === "role" ? (
                          <span className={`role-pill role-${String(row[column] || "student").toLowerCase()}`}>
                            {String(row[column] || "student")}
                          </span>
                        ) : column === "context" ? (
                          formatContext(row[column])
                        ) : column === "academic_year" ? (
                          formatAcademicYear(row[column])
                        ) : (
                          formatCell(row[column])
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {tableStatus === "ready" && tableData && tableData.rows.length > 0 && filteredRows.length === 0 && (
        <p className="admin-list-message">No matches found.</p>
      )}
    </div>
  );
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return JSON.stringify(value);
}

function formatContext(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return String(value).replace(/ Context$/, "");
}

function formatAcademicYear(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const str = String(value);
  const match = str.match(/^(\d{4})-(\d{4})$/);
  if (match) {
    return `${match[1].slice(2)}-${match[2].slice(2)}`;
  }
  return str;
}
