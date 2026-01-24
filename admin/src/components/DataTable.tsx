import { useAdminStore } from "../store/adminStore";

interface ColumnConfig {
  key: string;
  label: string;
  formatter?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface DataTableProps {
  columns: ColumnConfig[];
  rows: Record<string, unknown>[];
  activeTable: string;
  selectedProjectId?: string | null;
  onRowClick?: (row: Record<string, unknown>) => void;
  onRowDoubleClick?: (row: Record<string, unknown>) => void;
  getRowClassName?: (row: Record<string, unknown>) => string;
}

export function DataTable({
  columns,
  rows,
  activeTable,
  selectedProjectId,
  onRowClick,
  onRowDoubleClick,
  getRowClassName,
}: DataTableProps) {
  const isProjectsTable = activeTable === "projects";

  return (
    <div className="admin-list-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const rowId = typeof row.id === "string" ? row.id : null;
            const isSelected = isProjectsTable && rowId === selectedProjectId;
            const baseClassName = isProjectsTable
              ? `row-clickable status-${String(row.status || "draft").toLowerCase()}`
              : "";
            const customClassName = getRowClassName ? getRowClassName(row) : "";

            return (
              <tr
                key={`${activeTable}-${rowIndex}`}
                className={`${baseClassName} ${customClassName} ${isSelected ? "row-selected" : ""}`}
                onClick={() => onRowClick?.(row)}
                onDoubleClick={() => onRowDoubleClick?.(row)}
              >
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.formatter ? column.formatter(row[column.key], row) : formatCell(row[column.key])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: unknown): React.ReactNode {
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

export function formatRole(value: unknown): React.ReactNode {
  const role = String(value || "student").toLowerCase();
  return <span className={`role-pill role-${role}`}>{role}</span>;
}

export { formatContext, formatAcademicYear };
