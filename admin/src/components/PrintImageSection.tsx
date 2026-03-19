import { useRef, useState } from "react";
import { FileCheck, FileImage, Trash2 } from "lucide-react";
import { useShallow } from "zustand/shallow";
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

function getFilenameParts(filepath: string): { name: string; extension: string } {
  const parts = filepath.split("/");
  const basename = parts[parts.length - 1] || filepath;
  const dotIndex = basename.lastIndexOf(".");
  if (dotIndex === -1) {
    return { name: basename, extension: "" };
  }
  return {
    name: basename.slice(0, dotIndex),
    extension: basename.slice(dotIndex),
  };
}

export function PrintImageSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validationResult, setValidationResult] = useState<PrintImageValidationResult | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    editDraft,
    updateEditField,
    printImageStatus,
    printImageError,
    uploadPrintImage,
    deletePrintImage,
    canEditProject,
  } = useAdminStore(
    useShallow((state) => ({
      editDraft: state.editDraft,
      updateEditField: state.updateEditField,
      printImageStatus: state.printImageStatus,
      printImageError: state.printImageError,
      uploadPrintImage: state.uploadPrintImage,
      deletePrintImage: state.deletePrintImage,
      canEditProject: state.canEditProject,
    }))
  );

  const editAllowed = canEditProject().allowed;

  if (!editDraft) return null;

  const printImagePath = editDraft.print_image_path;
  const printDescriptionLength = editDraft.print_description.length;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = "";

    if (!isPrintImageSupported(file)) {
      setValidationResult({
        valid: false,
        width: 0,
        height: 0,
        error: "Only JPEG and PNG files are supported for print images.",
      });
      return;
    }

    const result = await validatePrintImageDimensions(file);
    setValidationResult(result);

    if (result.valid) {
      await uploadPrintImage(file);
      setValidationResult(null);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await deletePrintImage();
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    setValidationResult(null);
  };

  return (
    <div className="print-image-section">
      <h4>Print Image for Postcard</h4>
      <p className="print-image-description">
        {PRINT_IMAGE_REQUIREMENTS.description}. Minimum dimensions: {PRINT_IMAGE_REQUIREMENTS.minPortrait.width}x
        {PRINT_IMAGE_REQUIREMENTS.minPortrait.height}px (portrait) or {PRINT_IMAGE_REQUIREMENTS.minLandscape.width}x
        {PRINT_IMAGE_REQUIREMENTS.minLandscape.height}px (landscape).
      </p>

      {printImagePath && (
        <div className="print-image-file">
          <div className="print-image-file-info">
            <FileCheck size={20} className="file-icon" />
            <span
              className="file-name"
              title={`${getFilenameParts(printImagePath).name}${getFilenameParts(printImagePath).extension}`}
            >
              <span className="file-name-base">{getFilenameParts(printImagePath).name}</span>
              <span className="file-name-ext">{getFilenameParts(printImagePath).extension}</span>
            </span>
            {editAllowed && (
              <button
                type="button"
                className="delete-print-image-btn"
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete print image"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="edit-row" style={{ marginTop: "1rem" }}>
        <div className="edit-field">
          <label className="edit-label" htmlFor="print-caption">
            Print Caption <span className="required-marker">*</span>
          </label>
          <input
            id="print-caption"
            type="text"
            className="edit-input"
            value={editDraft.print_caption}
            onChange={(e) => updateEditField("print_caption", e.target.value)}
            placeholder="Short heading for the postcard"
            disabled={!editAllowed}
          />
        </div>
        <div className="edit-field">
          <label className="edit-label" htmlFor="print-language">
            Print Language <span className="required-marker">*</span>
          </label>
          <select
            id="print-language"
            className="edit-select"
            value={editDraft.print_language}
            onChange={(e) => updateEditField("print_language", e.target.value)}
            disabled={!editAllowed}
          >
            <option value="">Choose language...</option>
            <option value="nl">NL</option>
            <option value="en">EN</option>
          </select>
        </div>
      </div>

      <div className="edit-field" style={{ marginTop: "1rem" }}>
        <label className="edit-label" htmlFor="print-description">
          Print Description <span className="required-marker">*</span>
        </label>
        <textarea
          id="print-description"
          className="edit-textarea"
          value={editDraft.print_description}
          onChange={(e) => updateEditField("print_description", e.target.value)}
          placeholder="Description for the printed postcard..."
          maxLength={500}
          disabled={!editAllowed}
        />
        <div className="field-character-count">{printDescriptionLength}/500</div>
      </div>

      {!printImagePath && editAllowed && (
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
              type="button"
              className="upload-print-image-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={printImageStatus === "uploading"}
            >
              {printImageStatus === "uploading" ? "Uploading..." : "Upload Print Image"}
            </button>
            <span className="upload-hint">JPEG or PNG only</span>
          </div>

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

      {printImageError && <div className="print-image-error">{printImageError}</div>}

      {!editAllowed && !printImagePath && <p className="no-edit-hint">Editing is disabled for this project.</p>}

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
