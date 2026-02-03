import { CheckCircle, Send, XCircle } from "lucide-react";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

type ChecklistItem = {
  label: string;
  valid: boolean;
};

type SubmitChecklistSectionProps = {
  title: string;
  checklist: ChecklistItem[];
  allValid: boolean;
  submitStatus?: SubmitStatus;
  submitError?: string | null;
  onSubmit?: () => void;
};

export function SubmitChecklistSection({
  title,
  checklist,
  allValid,
  submitStatus,
  submitError,
  onSubmit,
}: SubmitChecklistSectionProps) {
  const hasSubmit = typeof onSubmit === "function";
  const isSubmitting = submitStatus === "submitting";

  return (
    <div className="detail-submit-section">
      <div className="submit-section-header">
        <h4>{title}</h4>
        {hasSubmit && <p>Complete all required fields before submitting your project.</p>}
      </div>

      <div className="submit-checklist">
        {checklist.map((item) => (
          <div key={item.label} className={`checklist-item ${item.valid ? "valid" : "invalid"}`}>
            {item.valid ? <CheckCircle size={16} /> : <XCircle size={16} />}
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {hasSubmit && submitStatus === "success" && (
        <div className="submit-success-message">Project submitted successfully!</div>
      )}

      {hasSubmit && submitError && <div className="submit-error-message">{submitError}</div>}

      {hasSubmit && (
        <button
          type="button"
          className="btn btn-primary submit-project-btn"
          disabled={!allValid || isSubmitting}
          onClick={onSubmit}
        >
          <Send size={14} />
          {isSubmitting ? "Submitting..." : "Submit Project"}
        </button>
      )}

      {hasSubmit && !allValid && <p className="submit-hint">Complete all checklist items to enable submission.</p>}
    </div>
  );
}
