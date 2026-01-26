import { useRef, useState, useCallback } from "react";
import { useAdminStore } from "../store/adminStore";
import {
  validatePrintImageDimensions,
  isPrintImageSupported,
  PRINT_IMAGE_REQUIREMENTS,
  type PrintImageValidationResult,
} from "../utils";

const TEMPLATE_BASE_URL = "https://files.sintlucasmasters.com/postcard-templates";

const TEMPLATES = [
  { name: "Landscape PDF", url: `${TEMPLATE_BASE_URL}/postcard-a6-landscape.pdf` },
  { name: "Portrait PDF", url: `${TEMPLATE_BASE_URL}/postcard-a6-portrait.pdf` },
  { name: "Landscape PNG", url: `${TEMPLATE_BASE_URL}/postcard-a6-landscape.png` },
  { name: "Portrait PNG", url: `${TEMPLATE_BASE_URL}/postcard-a6-portrait.png` },
];

export function PrintImageSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validationResult, setValidationResult] = useState<PrintImageValidationResult | null>(null);
  const [captionValue, setCaptionValue] = useState("");
  const [captionSaving, setCaptionSaving] = useState(false);

  const printImage = useAdminStore((state) => state.printImage);
  const printImageStatus = useAdminStore((state) => state.printImageStatus);
  const printImageError = useAdminStore((state) => state.printImageError);
  const uploadPrintImage = useAdminStore((state) => state.uploadPrintImage);
  const updatePrintImageCaption = useAdminStore((state) => state.updatePrintImageCaption);
  const deletePrintImage = useAdminStore((state) => state.deletePrintImage);
  const isStudentMode = useAdminStore((state) => state.isStudentMode);
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
    if (!confirm("Are you sure you want to delete the print image?")) return;
    await deletePrintImage();
    setValidationResult(null);
    setCaptionValue("");
  };

  // Construct R2 URL for print image preview
  const getPrintImageUrl = (cloudflareId: string) => {
    return `https://files.sintlucasmasters.com/${cloudflareId}`;
  };

  return (
    <div className="print-image-section">
      <h4>Print Image (Postcard)</h4>
      <p className="print-image-description">
        {PRINT_IMAGE_REQUIREMENTS.description}. Minimum dimensions: {PRINT_IMAGE_REQUIREMENTS.minPortrait.width}x
        {PRINT_IMAGE_REQUIREMENTS.minPortrait.height}px (portrait) or {PRINT_IMAGE_REQUIREMENTS.minLandscape.width}x
        {PRINT_IMAGE_REQUIREMENTS.minLandscape.height}px (landscape).
      </p>

      {/* Templates section */}
      <div className="print-templates">
        <span className="templates-label">Download templates:</span>
        <div className="template-links">
          {TEMPLATES.map((template) => (
            <a
              key={template.url}
              href={template.url}
              target="_blank"
              rel="noopener noreferrer"
              className="template-link"
            >
              {template.name}
            </a>
          ))}
        </div>
      </div>

      {/* Current print image */}
      {printImage && (
        <div className="print-image-preview">
          <div className="print-image-container">
            <img src={getPrintImageUrl(printImage.cloudflare_id)} alt="Print image" />
            {editAllowed && (
              <button className="delete-print-image" onClick={handleDelete} title="Delete print image">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                  <path
                    fillRule="evenodd"
                    d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
                  />
                </svg>
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
    </div>
  );
}
