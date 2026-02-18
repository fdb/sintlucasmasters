import { Download } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import { useExportStatus } from "../api/queries";
import { formatProgram, formatAcademicYear } from "../utils";

type ExportOverlayProps = {
  open: boolean;
  onClose: () => void;
  year: string;
  program: string;
};

function ExportOverlay({ open, onClose, year, program }: ExportOverlayProps) {
  const { data, isLoading } = useExportStatus(open ? year : undefined, open ? program : undefined);

  if (!open) return null;

  const readyStudents = data?.students.filter((s) => s.hasPrintImage && s.hasCaption) ?? [];
  const notReady = data?.students.filter((s) => !s.hasPrintImage || !s.hasCaption) ?? [];
  const canDownload = readyStudents.length > 0;

  const handleDownload = () => {
    window.open(
      `/api/admin/export/print-images.zip?year=${encodeURIComponent(year)}&program=${encodeURIComponent(program)}`
    );
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "published":
        return "status-published";
      case "ready_for_print":
        return "status-ready_for_print";
      case "submitted":
        return "status-submitted";
      default:
        return "status-draft";
    }
  };

  const getIssues = (student: { hasPrintImage: boolean; hasCaption: boolean }) => {
    const issues: string[] = [];
    if (!student.hasPrintImage) issues.push("missing print image");
    if (!student.hasCaption) issues.push("missing caption");
    return issues;
  };

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="export-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="export-overlay-header">
          <h3>Export for Print</h3>
          <span className="export-overlay-meta">
            {formatProgram(program)} &middot; {formatAcademicYear(year)}
          </span>
        </div>

        {isLoading && <p className="export-overlay-loading">Loading export status...</p>}

        {data && (
          <>
            <div className="export-overlay-summary">
              {readyStudents.length}/{data.total} students ready for print
            </div>

            {readyStudents.length > 0 && (
              <div className="export-overlay-section">
                <div className="export-overlay-section-label">Ready ({readyStudents.length})</div>
                <div className="export-overlay-list">
                  {readyStudents.map((student) => (
                    <div key={student.id} className="export-overlay-item">
                      <span className="export-overlay-name">{student.studentName}</span>
                      <span className={`export-overlay-status ${getStatusClass(student.status)}`}>
                        {student.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {notReady.length > 0 && (
              <div className="export-overlay-section">
                <div className="export-overlay-section-label">Not ready ({notReady.length})</div>
                <div className="export-overlay-list">
                  {notReady.map((student) => (
                    <div key={student.id} className="export-overlay-item">
                      <span className="export-overlay-name">{student.studentName}</span>
                      <span className={`export-overlay-status ${getStatusClass(student.status)}`}>
                        {student.status.replace(/_/g, " ")}
                      </span>
                      <span className="export-overlay-issues">{getIssues(student).join(" \u00b7 ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="export-overlay-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                className={`btn btn-primary${!canDownload ? " disabled" : ""}`}
                onClick={canDownload ? handleDownload : undefined}
                disabled={!canDownload}
              >
                <Download size={14} />
                Download ZIP
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ExportButton() {
  const selectedYear = useAdminStore((s) => s.selectedYear);
  const selectedProgram = useAdminStore((s) => s.selectedProgram);
  const exportOverlayOpen = useAdminStore((s) => s.exportOverlayOpen);
  const setExportOverlayOpen = useAdminStore((s) => s.setExportOverlayOpen);

  const { data } = useExportStatus(selectedYear || undefined, selectedProgram || undefined);

  // Only show when both year and programme are selected
  if (!selectedYear || !selectedProgram) return null;

  const total = data?.total ?? 0;

  return (
    <>
      <div className="detail-action-group">
        <button
          type="button"
          className="detail-action-btn has-label"
          onClick={() => setExportOverlayOpen(true)}
          title="Export print images for selected programme and year"
        >
          <Download size={14} />
          Export for Print...
        </button>
      </div>
      {total > 0 && <span className="detail-header-count">{total} selected</span>}
      <ExportOverlay
        open={exportOverlayOpen}
        onClose={() => setExportOverlayOpen(false)}
        year={selectedYear}
        program={selectedProgram}
      />
    </>
  );
}
