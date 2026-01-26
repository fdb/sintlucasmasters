import { useState } from "react";
import { CheckCircle, XCircle, Send, SquareArrowOutUpRight } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import { ConfirmDialog } from "./ConfirmDialog";

export function StudentPreviewPanel() {
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const {
    editDraft,
    editImages,
    projectDetail,
    submitValidation,
    submitStatus,
    submitError,
    submitProject,
    printImage,
  } = useAdminStore((state) => ({
    editDraft: state.editDraft,
    editImages: state.editImages,
    projectDetail: state.projectDetail,
    submitValidation: state.submitValidation,
    submitStatus: state.submitStatus,
    submitError: state.submitError,
    submitProject: state.submitProject,
    printImage: state.printImage,
  }));

  const handleSubmit = async () => {
    setShowSubmitConfirm(false);
    await submitProject();
  };

  // Use editDraft for live preview, falling back to projectDetail
  const project = editDraft || projectDetail?.project;
  const status = editDraft?.status || String(projectDetail?.project.status || "draft");
  const canSubmit = status === "draft";

  // Validation checklist using live editDraft values
  const getValidationChecklist = () => {
    if (!editDraft) return [];

    const webImages = editImages.filter((img) => img.type !== "print");

    return [
      {
        label: "Project Title",
        valid: !!editDraft.project_title.trim(),
      },
      {
        label: "Bio",
        valid: !!editDraft.bio.trim(),
      },
      {
        label: "Description",
        valid: !!editDraft.description.trim(),
      },
      {
        label: "Print Image",
        valid: !!printImage,
      },
      {
        label: "Print Image Caption",
        valid: !!printImage && !!(printImage.caption || "").trim(),
      },
      {
        label: "Main Image",
        valid: !!editDraft.main_image_id.trim(),
      },
    ];
  };

  const checklist = getValidationChecklist();
  const allValid = checklist.every((item) => item.valid);

  if (!project) {
    return (
      <div className="student-preview-panel">
        <div className="student-preview-empty">
          <p>Loading project preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-preview-panel">
      <div className="preview-header">
        <h3>Preview</h3>
        <a
          href={`/${projectDetail?.project.academic_year || ""}/students/${projectDetail?.project.slug || ""}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="preview-external-link"
          title="Open project page"
        >
          <SquareArrowOutUpRight size={14} />
          View live page
        </a>
      </div>

      {/* Submit for Review section */}
      {canSubmit && (
        <div className="detail-submit-section">
          <div className="submit-section-header">
            <h4>Submit for Review</h4>
            <p>Complete all required fields before submitting your project.</p>
          </div>

          <div className="submit-checklist">
            {checklist.map((item) => (
              <div key={item.label} className={`checklist-item ${item.valid ? "valid" : "invalid"}`}>
                {item.valid ? <CheckCircle size={16} /> : <XCircle size={16} />}
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {submitStatus === "success" && <div className="submit-success-message">Project submitted successfully!</div>}

          {submitError && <div className="submit-error-message">{submitError}</div>}

          <button
            type="button"
            className="btn btn-primary submit-project-btn"
            disabled={!allValid || submitStatus === "submitting"}
            onClick={() => setShowSubmitConfirm(true)}
          >
            <Send size={14} />
            {submitStatus === "submitting" ? "Submitting..." : "Submit Project"}
          </button>

          {!allValid && <p className="submit-hint">Complete all checklist items to enable submission.</p>}
        </div>
      )}

      {/* Submitted status */}
      {status === "submitted" && (
        <div className="detail-submitted-banner">
          <CheckCircle size={18} />
          <span>Your project has been submitted and is awaiting review.</span>
        </div>
      )}

      {/* Locked status */}
      {status === "ready_for_print" && (
        <div className="detail-locked-banner">
          <span>Your project is locked for printing. Contact an administrator if changes are needed.</span>
        </div>
      )}

      {/* Live preview content */}
      <div className="preview-content">
        <div className="preview-name">{editDraft?.student_name || "Student Name"}</div>
        <div className="preview-title">{editDraft?.project_title || "Project Title"}</div>
        <div className="preview-context">
          {editDraft?.program || ""} {editDraft?.program && editDraft?.context ? "·" : ""} {editDraft?.context || ""}
        </div>
        <div className="preview-year">{editDraft?.academic_year || ""}</div>

        {/* Main image preview */}
        {editDraft?.main_image_id && (
          <div className="preview-main-image">
            <img
              src={`https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/${editDraft.main_image_id}/public`}
              alt="Main project image"
            />
          </div>
        )}

        {/* Bio */}
        {editDraft?.bio && (
          <div className="preview-section">
            <div className="preview-section-label">Bio</div>
            <div className="preview-text">{editDraft.bio}</div>
          </div>
        )}

        {/* Description */}
        {editDraft?.description && (
          <div className="preview-section">
            <div className="preview-section-label">Description</div>
            <div className="preview-text">{editDraft.description}</div>
          </div>
        )}

        {/* Image gallery */}
        {editImages.filter((img) => img.type !== "print").length > 0 && (
          <div className="preview-section">
            <div className="preview-section-label">Images</div>
            <div className="preview-images">
              {editImages
                .filter((img) => img.type !== "print")
                .map((img) => (
                  <div
                    key={img.id}
                    className={`preview-image-thumb ${img.cloudflare_id === editDraft?.main_image_id ? "is-main" : ""}`}
                  >
                    <img
                      src={`https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/${img.cloudflare_id}/thumb`}
                      alt={img.caption || "Project image"}
                    />
                    {img.cloudflare_id === editDraft?.main_image_id && <span className="image-badge">Main</span>}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Social links */}
        {editDraft?.social_links && editDraft.social_links.filter(Boolean).length > 0 && (
          <div className="preview-section">
            <div className="preview-section-label">Social Links</div>
            <div className="preview-links">
              {editDraft.social_links.filter(Boolean).map((link, idx) => (
                <a
                  key={idx}
                  href={link.startsWith("http") ? link : `https://${link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="preview-link"
                >
                  {link.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {editDraft?.tags && editDraft.tags.length > 0 && (
          <div className="preview-section">
            <div className="preview-section-label">Tags</div>
            <div className="preview-tags">
              {editDraft.tags.map((tag) => (
                <span key={tag} className="preview-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showSubmitConfirm}
        title="Submit project?"
        description={
          <>
            Are you sure you want to submit your project for review? You can still edit it after submission, but the
            status will change to "submitted".
          </>
        }
        onCancel={() => setShowSubmitConfirm(false)}
        onConfirm={handleSubmit}
        isLoading={submitStatus === "submitting"}
        errorMessage={submitError}
        confirmLabel="Submit"
        confirmVariant="primary"
      />
    </div>
  );
}
