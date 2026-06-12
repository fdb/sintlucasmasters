import { useMemo, useState } from "react";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";

interface ColumnConfig {
  key: string;
  label: string;
  formatter?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
  // Sort by a derived value instead of the raw cell — e.g. the formatted
  // programme label, which folds in `context`. Defaults to row[key].
  sortValue?: (row: Record<string, unknown>) => string | number;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

function compareValues(a: unknown, b: unknown): number {
  const aEmpty = a === null || a === undefined || a === "";
  const bEmpty = b === null || b === undefined || b === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1; // empties sort last
  if (bEmpty) return -1;

  const aNum = Number(a);
  const bNum = Number(b);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;

  return String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });
}

interface DataTableProps {
  columns: ColumnConfig[];
  rows: Record<string, unknown>[];
  activeTable: string;
  selectedProjectId?: string | null;
  selectedRowId?: string | null;
  onRowClick?: (row: Record<string, unknown>) => void;
  onRowDoubleClick?: (row: Record<string, unknown>) => void;
  getRowClassName?: (row: Record<string, unknown>) => string;
  // Multi-select (opt-in). When `selectable` is set a leading checkbox column
  // is rendered; selection is tracked by the parent via `selectedIds`.
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, opts: { shiftKey: boolean; orderedIds: string[] }) => void;
  onToggleSelectAll?: (orderedIds: string[], checked: boolean) => void;
}

export function DataTable({
  columns,
  rows,
  activeTable,
  selectedProjectId,
  selectedRowId,
  onRowClick,
  onRowDoubleClick,
  getRowClassName,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: DataTableProps) {
  const isProjectsTable = activeTable === "projects";
  const isClickable = !!onRowClick;
  const [sort, setSort] = useState<SortState>(null);

  const handleSort = (key: string): void => {
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  };

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    const accessor = column?.sortValue ?? ((row: Record<string, unknown>) => row[sort.key]);
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => compareValues(accessor(a), accessor(b)) * factor);
  }, [rows, sort, columns]);

  // Ids of the currently visible rows, in display order — the basis for both
  // "select all" and shift-click range selection.
  const orderedIds = useMemo(
    () => sortedRows.map((row) => (typeof row.id === "string" ? row.id : null)).filter((id): id is string => !!id),
    [sortedRows]
  );
  const selectedCount = selectable && selectedIds ? orderedIds.filter((id) => selectedIds.has(id)).length : 0;
  const allSelected = selectedCount > 0 && selectedCount === orderedIds.length;
  const someSelected = selectedCount > 0 && !allSelected;

  return (
    <div className="admin-list-scroll">
      <table>
        <thead>
          <tr>
            {selectable && (
              <th className="select-col">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={() => onToggleSelectAll?.(orderedIds, !allSelected)}
                />
              </th>
            )}
            {columns.map((column) => {
              const isActive = sort?.key === column.key;
              const ariaSort = isActive ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
              return (
                <th key={column.key} className="sortable" aria-sort={ariaSort} onClick={() => handleSort(column.key)}>
                  <span className="th-sort">
                    {column.label}
                    {isActive ? (
                      sort.dir === "asc" ? (
                        <ChevronUp size={12} className="th-sort-icon active" />
                      ) : (
                        <ChevronDown size={12} className="th-sort-icon active" />
                      )
                    ) : (
                      <ChevronsUpDown size={12} className="th-sort-icon" />
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, rowIndex) => {
            const rowId = typeof row.id === "string" ? row.id : null;
            const isSelected = rowId === selectedProjectId || rowId === selectedRowId;
            const isChecked = !!(selectable && rowId && selectedIds?.has(rowId));
            const baseClassName = isProjectsTable
              ? `row-clickable status-${String(row.status || "draft").toLowerCase()}`
              : isClickable
                ? "row-clickable"
                : "";
            const customClassName = getRowClassName ? getRowClassName(row) : "";
            const rowKey = rowId ? `${activeTable}-${rowId}` : `${activeTable}-${rowIndex}`;

            return (
              <tr
                key={rowKey}
                className={`${baseClassName} ${customClassName} ${isSelected ? "row-selected" : ""} ${isChecked ? "row-checked" : ""}`}
                onClick={() => onRowClick?.(row)}
                onDoubleClick={() => onRowDoubleClick?.(row)}
              >
                {selectable && (
                  <td className="select-col" onClick={(e) => e.stopPropagation()}>
                    {rowId && (
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        checked={isChecked}
                        onChange={() => {}}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSelect?.(rowId, { shiftKey: e.shiftKey, orderedIds });
                        }}
                      />
                    )}
                  </td>
                )}
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

export function formatRole(value: unknown): React.ReactNode {
  const role = String(value || "student").toLowerCase();
  return <span className={`role-pill role-${role}`}>{role}</span>;
}
