import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import { useTable } from "../api/queries";
import { useBatchUpdateProjectStatus } from "../api/mutations";
import { ConfirmDialog } from "./ConfirmDialog";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "reviewed", label: "Reviewed" },
  { value: "ready_for_print", label: "Ready for print" },
  { value: "published", label: "Published" },
];

function statusLabel(value: string): string {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label ?? value.replace(/_/g, " ");
}

export function BatchOperationsPanel() {
  const selectedProjectIds = useAdminStore((s) => s.selectedProjectIds);
  const clearProjectSelection = useAdminStore((s) => s.clearProjectSelection);
  const { data: tableData } = useTable("projects");
  const batchMutation = useBatchUpdateProjectStatus();

  const [targetStatus, setTargetStatus] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Resolve the selected ids to their rows so we can show names + current status.
  const selectedProjects = useMemo(() => {
    const rows = tableData?.table === "projects" ? tableData.rows : [];
    return rows.filter((row) => typeof row.id === "string" && selectedProjectIds.has(row.id));
  }, [tableData, selectedProjectIds]);

  const count = selectedProjectIds.size;

  const handleApply = (): void => {
    if (!targetStatus) return;
    batchMutation.mutate(
      { ids: [...selectedProjectIds], status: targetStatus },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          setTargetStatus("");
          clearProjectSelection();
        },
      }
    );
  };

  return (
    <div className="admin-detail-panel">
      <div className="admin-detail-content batch-panel">
        <div className="detail-header-row">
          <h3>{count} selected</h3>
          <div className="detail-action-group">
            <button type="button" className="detail-action-btn has-label" onClick={clearProjectSelection}>
              <X size={14} />
              Clear
            </button>
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-section-label">Change status to</div>
          <div className="batch-status-controls">
            <select
              className="filter-select batch-status-select"
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
            >
              <option value="">Select status…</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="detail-action-btn has-label batch-apply-btn"
              disabled={!targetStatus || batchMutation.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              Apply
            </button>
          </div>
          {batchMutation.isError && (
            <p className="batch-error">{batchMutation.error?.message || "Failed to update projects."}</p>
          )}
        </div>

        <div className="detail-section">
          <div className="detail-section-label">Selected projects</div>
          <ul className="batch-project-list">
            {selectedProjects.map((row) => {
              const id = String(row.id);
              const status = String(row.status || "draft").toLowerCase();
              return (
                <li key={id} className="batch-project-item">
                  <span className="batch-project-name">{String(row.student_name || "Untitled")}</span>
                  <span className={`status-dot status-${status}`} title={statusLabel(status)} aria-hidden="true" />
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Change status?"
        description={
          <>
            Change the status of <strong>{count}</strong> {count === 1 ? "project" : "projects"} to{" "}
            <strong>{statusLabel(targetStatus)}</strong>?
          </>
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleApply}
        isLoading={batchMutation.isPending}
        errorMessage={batchMutation.isError ? batchMutation.error?.message || "Failed to update projects." : null}
        confirmLabel="Apply"
        confirmVariant="primary"
      />
    </div>
  );
}
