import { useState } from "react";
import { Download, ChevronRight, ChevronDown } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import { useExportStatus } from "../api/queries";
import { formatProgram } from "../utils";

export function ExportPanel(): React.ReactNode {
  const selectedYear = useAdminStore((s) => s.selectedYear);
  const selectedProgram = useAdminStore((s) => s.selectedProgram);
  const { data, isLoading } = useExportStatus(selectedYear || undefined, selectedProgram || undefined);
  const [expanded, setExpanded] = useState(false);

  if (!selectedYear || !selectedProgram) return null;
  if (isLoading)
    return (
      <div className="export-panel">
        <p className="export-panel-loading">Loading export status...</p>
      </div>
    );
  if (!data) return null;

  const notReady = data.students.filter((s) => !s.hasPrintImage || !s.hasCaption);
  const progress = data.total > 0 ? (data.readyForPrint / data.total) * 100 : 0;
  const canDownload = data.readyForPrint > 0;

  const handleDownload = () => {
    window.open(
      `/api/admin/export/print-images.zip?year=${encodeURIComponent(selectedYear)}&program=${encodeURIComponent(selectedProgram)}`
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

  const getIssues = (student: (typeof data.students)[0]) => {
    const issues: string[] = [];
    if (!student.hasPrintImage) issues.push("missing print image");
    if (!student.hasCaption) issues.push("missing caption");
    return issues;
  };

  return (
    <div className="export-panel">
      <div className="export-panel-header">
        <span className="export-panel-title">EXPORT</span>
        <span className="export-panel-subtitle">{formatProgram(selectedProgram)}</span>
      </div>
      <div className="export-panel-body">
        <div className="export-progress-container">
          <div className="export-progress-bar">
            <div className="export-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="export-progress-text">
            {data.readyForPrint}/{data.total} ready for print
          </span>
        </div>
        <div className="export-panel-actions">
          {notReady.length > 0 && (
            <button type="button" className="export-toggle-btn" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {notReady.length} student{notReady.length !== 1 ? "s" : ""} not ready
            </button>
          )}
          <button
            type="button"
            className={`export-download-btn${!canDownload ? " disabled" : ""}`}
            onClick={canDownload ? handleDownload : undefined}
            disabled={!canDownload}
          >
            <Download size={14} />
            Download ZIP
          </button>
        </div>
        {expanded && notReady.length > 0 && (
          <div className="export-not-ready-list">
            {notReady.map((student) => (
              <div key={student.id} className="export-not-ready-item">
                <span className="export-student-name">{student.studentName}</span>
                <span className={`export-student-status ${getStatusClass(student.status)}`}>
                  {student.status.replace(/_/g, " ")}
                </span>
                {getIssues(student).length > 0 && (
                  <span className="export-student-issues">{getIssues(student).join(" \u00b7 ")}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
