import type { ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  confirmVariant?: "danger" | "primary";
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false,
  errorMessage,
  confirmVariant = "danger",
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmClass = confirmVariant === "danger" ? "btn btn-danger" : "btn btn-primary";

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
        <div className="confirm-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </button>
          <button type="button" className={confirmClass} onClick={onConfirm} disabled={isLoading}>
            {isLoading ? `${confirmLabel}ing…` : confirmLabel}
          </button>
        </div>
        {errorMessage ? (
          <p className="error-message" style={{ marginTop: "1rem" }}>
            {errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
