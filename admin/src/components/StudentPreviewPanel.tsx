import { useState } from "react";
import { CheckCircle, SquareArrowOutUpRight, Undo2 } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import { ConfirmDialog } from "./ConfirmDialog";
import { SubmitChecklistSection } from "./SubmitChecklistSection";

export function StudentPreviewPanel() {
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

  const {
    editDraft,
    editImages,
    projectDetail,
    submitValidation,
    submitStatus,
    submitError,
    submitProject,
    printImage,
    updateEditField,
    saveProject,
  } = useAdminStore((state) => ({
    editDraft: state.editDraft,
    editImages: state.editImages,
    projectDetail: state.projectDetail,
    submitValidation: state.submitValidation,
    submitStatus: state.submitStatus,
    submitError: state.submitError,
    submitProject: state.submitProject,
    printImage: state.printImage,
    updateEditField: state.updateEditField,
    saveProject: state.saveProject,
  }));

  const handleSubmit = async () => {
    setShowSubmitConfirm(false);
    await submitProject();
  };

  const handleRevertToDraft = async () => {
    setIsReverting(true);
    updateEditField("status", "draft");
    await saveProject();
    setIsReverting(false);
    setShowRevertConfirm(false);
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
        {status === "published" ? (
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
        ) : (
          <span className="preview-external-link disabled" title="Project is not published yet">
            <SquareArrowOutUpRight size={14} />
            Not published
          </span>
        )}
      </div>

      {/* Submit for Review section */}
      {canSubmit && (
        <SubmitChecklistSection
          title="Submit for Review"
          checklist={checklist}
          allValid={allValid}
          submitStatus={submitStatus}
          submitError={submitError}
          onSubmit={() => setShowSubmitConfirm(true)}
        />
      )}

      {/* Submitted status */}
      {status === "submitted" && (
        <div className="detail-submitted-banner">
          <div className="submitted-banner-content">
            <CheckCircle size={18} />
            <span>Your project has been submitted and is awaiting review.</span>
          </div>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setShowRevertConfirm(true)}>
            <Undo2 size={14} />
            Return to Draft
          </button>
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
            Once submitted, your project will be locked for editing. If you need to make changes later, you can click
            "Return to Draft" to unlock it and edit again.
          </>
        }
        onCancel={() => setShowSubmitConfirm(false)}
        onConfirm={handleSubmit}
        isLoading={submitStatus === "submitting"}
        errorMessage={submitError}
        confirmLabel="Submit"
        confirmVariant="primary"
      />

      <ConfirmDialog
        open={showRevertConfirm}
        title="Return to draft?"
        description="This will change your project status back to draft. You can submit it again when ready."
        onCancel={() => setShowRevertConfirm(false)}
        onConfirm={handleRevertToDraft}
        isLoading={isReverting}
        confirmLabel="Return to Draft"
        confirmVariant="primary"
      />
    </div>
  );
}
