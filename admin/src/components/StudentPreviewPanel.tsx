import { useState } from "react";
import { CheckCircle, SquareArrowOutUpRight, Undo2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useShallow } from "zustand/shallow";
import { useAdminStore } from "../store/adminStore";
import { useProject } from "../api/queries";
import { useSubmitProject } from "../api/mutations";
import { ConfirmDialog } from "./ConfirmDialog";
import { SubmitChecklistSection } from "./SubmitChecklistSection";
import { queryKeys } from "../api/queryKeys";

export function StudentPreviewPanel() {
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const queryClient = useQueryClient();

  const { selectedProjectId, editDraft, editImages, printImage, updateEditField, saveProject, editLanguage } =
    useAdminStore(
      useShallow((state) => ({
        selectedProjectId: state.selectedProjectId,
        editDraft: state.editDraft,
        editImages: state.editImages,
        printImage: state.printImage,
        updateEditField: state.updateEditField,
        saveProject: state.saveProject,
        editLanguage: state.editLanguage,
      }))
    );

  const { data: projectDetail } = useProject(selectedProjectId);
  const submitProjectMutation = useSubmitProject(selectedProjectId);
  const submitStatus = submitProjectMutation.isPending
    ? "submitting"
    : submitProjectMutation.isError
      ? "error"
      : submitProjectMutation.isSuccess
        ? "success"
        : "idle";
  const submitError = submitProjectMutation.error?.message || null;

  const handleSubmit = async () => {
    setShowSubmitConfirm(false);
    submitProjectMutation.mutate(undefined, {
      onSuccess: () => {
        // Update local draft status to reflect the server-side change
        updateEditField("status", "submitted");
      },
    });
  };

  const handleRevertToDraft = async () => {
    setIsReverting(true);
    updateEditField("status", "draft");
    await saveProject({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.table("projects") });
      },
    });
    setIsReverting(false);
    setShowRevertConfirm(false);
  };

  // Use editDraft for live preview, falling back to projectDetail
  const project = editDraft || projectDetail?.project;
  const status = editDraft?.status || String(projectDetail?.project.status || "draft");
  const canSubmit = status === "draft";
  const webImages = editImages.filter((img) => img.type !== "print");
  const mainImage = webImages[0] || null;
  const contextLabels: Record<string, string> = {
    autonomous: "Autonomous",
    applied: "Applied",
    digital: "Digital",
    sociopolitical: "Socio-Political",
    jewelry: "Jewelry",
  };

  // Validation checklist using live editDraft values
  const getValidationChecklist = () => {
    if (!editDraft) return [];

    return [
      {
        label: "Project Title (EN)",
        valid: !!editDraft.project_title_en.trim(),
      },
      {
        label: "Project Title (NL)",
        valid: !!editDraft.project_title_nl.trim(),
      },
      {
        label: "Bio (EN)",
        valid: !!editDraft.bio_en.trim(),
      },
      {
        label: "Bio (NL)",
        valid: !!editDraft.bio_nl.trim(),
      },
      {
        label: "Description (EN)",
        valid: !!editDraft.description_en.trim(),
      },
      {
        label: "Description (NL)",
        valid: !!editDraft.description_nl.trim(),
      },
      {
        label: "Location (EN)",
        valid: !!editDraft.location_en.trim(),
      },
      {
        label: "Location (NL)",
        valid: !!editDraft.location_nl.trim(),
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
        valid: webImages.length > 0,
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
            href={`/nl/${projectDetail?.project.academic_year || ""}/students/${projectDetail?.project.slug || ""}/`}
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
        <div className="preview-title">
          {editLanguage === "nl"
            ? editDraft?.project_title_nl || editDraft?.project_title_en || "Project Title"
            : editDraft?.project_title_en || editDraft?.project_title_nl || "Project Title"}
        </div>
        <div className="preview-context">
          {editDraft?.program || ""} {editDraft?.program && editDraft?.context ? "·" : ""}{" "}
          {(editDraft?.context && contextLabels[editDraft.context]) || editDraft?.context || ""}
        </div>
        <div className="preview-year">{editDraft?.academic_year || ""}</div>

        {/* Main image preview */}
        {mainImage && (
          <div className="preview-main-image">
            <img
              src={`https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/${mainImage.cloudflare_id}/public`}
              alt="Main project image"
            />
          </div>
        )}

        {/* Bio */}
        {(editLanguage === "nl" ? editDraft?.bio_nl || editDraft?.bio_en : editDraft?.bio_en || editDraft?.bio_nl) && (
          <div className="preview-section">
            <div className="preview-section-label">Bio</div>
            <div className="preview-text">
              {editLanguage === "nl" ? editDraft?.bio_nl || editDraft?.bio_en : editDraft?.bio_en || editDraft?.bio_nl}
            </div>
          </div>
        )}

        {/* Description */}
        {(editLanguage === "nl"
          ? editDraft?.description_nl || editDraft?.description_en
          : editDraft?.description_en || editDraft?.description_nl) && (
          <div className="preview-section">
            <div className="preview-section-label">Description</div>
            <div className="preview-text">
              {editLanguage === "nl"
                ? editDraft?.description_nl || editDraft?.description_en
                : editDraft?.description_en || editDraft?.description_nl}
            </div>
          </div>
        )}

        {/* Image gallery */}
        {webImages.length > 0 && (
          <div className="preview-section">
            <div className="preview-section-label">Images</div>
            <div className="preview-images">
              {webImages.map((img, index) => (
                <div key={img.id} className={`preview-image-thumb ${index === 0 ? "is-main" : ""}`}>
                  <img
                    src={`https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/${img.cloudflare_id}/thumb`}
                    alt={img.caption || "Project image"}
                  />
                  {index === 0 && <span className="image-badge">Main</span>}
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
