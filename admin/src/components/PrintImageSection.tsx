import { useRef, useState, useCallback } from "react";
import { FileCheck, FileImage, Trash2 } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  validatePrintImageDimensions,
  isPrintImageSupported,
  PRINT_IMAGE_REQUIREMENTS,
  type PrintImageValidationResult,
} from "../utils";

const TEMPLATE_BASE_URL = "https://files.sintlucasmasters.com/postcard-templates";

const TEMPLATES = [
  { orientation: "Landscape", format: "PDF", url: `${TEMPLATE_BASE_URL}/postcard-a6-landscape.pdf` },
  { orientation: "Landscape", format: "PNG", url: `${TEMPLATE_BASE_URL}/postcard-a6-landscape.png` },
  { orientation: "Portrait", format: "PDF", url: `${TEMPLATE_BASE_URL}/postcard-a6-portrait.pdf` },
  { orientation: "Portrait", format: "PNG", url: `${TEMPLATE_BASE_URL}/postcard-a6-portrait.png` },
];

// Get basename from a path and split into name + extension
function getFilenameParts(filepath: string): { name: string; extension: string } {
  const parts = filepath.split("/");
  const basename = parts[parts.length - 1] || filepath;
  const dotIndex = basename.lastIndexOf(".");
  if (dotIndex === -1) {
    return { name: basename, extension: "" };
  }
  return {
    name: basename.slice(0, dotIndex),
    extension: basename.slice(dotIndex), // includes the dot
  };
}

export function PrintImageSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validationResult, setValidationResult] = useState<PrintImageValidationResult | null>(null);
  const [captionValue, setCaptionValue] = useState("");
  const [captionSaving, setCaptionSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const printImage = useAdminStore((state) => state.printImage);
  const printImageStatus = useAdminStore((state) => state.printImageStatus);
  const printImageError = useAdminStore((state) => state.printImageError);
  const uploadPrintImage = useAdminStore((state) => state.uploadPrintImage);
  const updatePrintImageCaption = useAdminStore((state) => state.updatePrintImageCaption);
  const deletePrintImage = useAdminStore((state) => state.deletePrintImage);
  const canEditProject = useAdminStore((state) => state.canEditProject);

  const editAllowed = canEditProject().allowed;

  // Initialize caption value when print image changes
  const initCaption = useCallback(() => {
    if (printImage?.caption !== undefined) {
      setCaptionValue(printImage.caption || "");
    }
  }, [printImage?.caption]);

  // Call initCaption when printImage changes
  if (printImage && captionValue === "" && printImage.caption) {
    initCaption();
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    event.target.value = "";

    // Check file type
    if (!isPrintImageSupported(file)) {
      setValidationResult({
        valid: false,
        width: 0,
        height: 0,
        error: "Only JPEG and PNG files are supported for print images.",
      });
      return;
    }

    // Validate dimensions
    const result = await validatePrintImageDimensions(file);
    setValidationResult(result);

    if (result.valid) {
      await uploadPrintImage(file);
      setValidationResult(null);
    }
  };

  const handleCaptionBlur = async () => {
    if (!printImage) return;
    if (captionValue === (printImage.caption || "")) return;

    setCaptionSaving(true);
    await updatePrintImageCaption(captionValue);
    setCaptionSaving(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await deletePrintImage();
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    setValidationResult(null);
    setCaptionValue("");
  };

  return (
    <div className="print-image-section">
      <h4>Print Image for Postcard</h4>
      <p className="print-image-description">
        {PRINT_IMAGE_REQUIREMENTS.description}. Minimum dimensions: {PRINT_IMAGE_REQUIREMENTS.minPortrait.width}x
        {PRINT_IMAGE_REQUIREMENTS.minPortrait.height}px (portrait) or {PRINT_IMAGE_REQUIREMENTS.minLandscape.width}x
        {PRINT_IMAGE_REQUIREMENTS.minLandscape.height}px (landscape).
      </p>

      {/* Current print image - show as file indicator, not preview */}
      {printImage && (
        <div className="print-image-file">
          <div className="print-image-file-info">
            <FileCheck size={20} className="file-icon" />
            <span
              className="file-name"
              title={`${getFilenameParts(printImage.cloudflare_id).name}${getFilenameParts(printImage.cloudflare_id).extension}`}
            >
              <span className="file-name-base">{getFilenameParts(printImage.cloudflare_id).name}</span>
              <span className="file-name-ext">{getFilenameParts(printImage.cloudflare_id).extension}</span>
            </span>
            {editAllowed && (
              <button
                className="delete-print-image-btn"
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete print image"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <div className="print-image-caption">
            <label htmlFor="print-image-caption">Caption (required for submission)</label>
            <input
              id="print-image-caption"
              type="text"
              value={captionValue}
              onChange={(e) => setCaptionValue(e.target.value)}
              onBlur={handleCaptionBlur}
              placeholder="Enter a caption for the print image"
              disabled={!editAllowed || captionSaving}
            />
            {captionSaving && <span className="caption-saving">Saving...</span>}
          </div>
        </div>
      )}

      {/* Upload area */}
      {!printImage && editAllowed && (
        <>
          <div className="print-image-upload">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <button
              className="upload-print-image-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={printImageStatus === "uploading"}
            >
              {printImageStatus === "uploading" ? "Uploading..." : "Upload Print Image"}
            </button>
            <span className="upload-hint">JPEG or PNG only</span>
          </div>

          {/* Templates section */}
          <div className="print-templates">
            <div className="templates-header">
              <span className="templates-label">Download templates</span>
              <span className="templates-hint">Red border indicates the bleed area (will be trimmed)</span>
            </div>
            <div className="template-links">
              {TEMPLATES.map((template) => (
                <a
                  key={template.url}
                  href={template.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="template-link"
                >
                  <FileImage size={16} className="template-icon" />
                  <span className="template-orientation">{template.orientation}</span>
                  <span className="template-format">{template.format}</span>
                </a>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Validation error */}
      {validationResult && !validationResult.valid && (
        <div className="print-image-error">
          {validationResult.error}
          {validationResult.width > 0 && (
            <span className="dimensions-info">
              (Your image: {validationResult.width}x{validationResult.height}px)
            </span>
          )}
        </div>
      )}

      {/* Upload error */}
      {printImageError && <div className="print-image-error">{printImageError}</div>}

      {/* No edit hint for students */}
      {!editAllowed && !printImage && <p className="no-edit-hint">Editing is disabled for this project.</p>}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete print image?"
        description="This will permanently remove the print image from storage."
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
