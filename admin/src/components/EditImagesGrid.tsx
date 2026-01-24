import { useMemo, useState, useRef, forwardRef, type CSSProperties, type HTMLAttributes } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  defaultDropAnimationSideEffects,
  type DragStartEvent,
  type DragEndEvent,
  type DragCancelEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Star, Plus, Trash2, X, AlertCircle, Loader2, Type } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import type { ProjectImage } from "../store/adminStore";

const ACCEPTED_TYPES = ".jpg,.jpeg,.png,.gif,.webp,.heic,.heif";
const MAX_DIMENSION = 3000;

export function EditImagesGrid() {
  const {
    editImages,
    editDraft,
    moveEditImage,
    setMainImage,
    updateImageCaption,
    uploadImages,
    deleteImage,
    uploadStatus,
    uploadError,
  } = useAdminStore((state) => ({
    editImages: state.editImages,
    editDraft: state.editDraft,
    moveEditImage: state.moveEditImage,
    setMainImage: state.setMainImage,
    updateImageCaption: state.updateImageCaption,
    uploadImages: state.uploadImages,
    deleteImage: state.deleteImage,
    uploadStatus: state.uploadStatus,
    uploadError: state.uploadError,
  }));

  const [activeId, setActiveId] = useState<string | null>(null);
  const [captionEditId, setCaptionEditId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      moveEditImage(String(active.id), String(over.id));
    }
    setActiveId(null);
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveId(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Client-side dimension check
    const validFiles: File[] = [];
    for (const file of files) {
      const isValid = await checkImageDimensions(file);
      if (isValid) {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      await uploadImages(validFiles);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const checkImageDimensions = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
          alert(`Image "${file.name}" exceeds maximum dimensions of ${MAX_DIMENSION}x${MAX_DIMENSION} pixels.`);
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve(true); // Let server handle validation
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteConfirm = async (imageId: string) => {
    setConfirmDeleteId(null);
    setDeletingId(imageId);
    try {
      await deleteImage(imageId);
    } finally {
      setDeletingId(null);
    }
  };

  const mainImageId = editDraft?.main_image_id || "";
  const activeIndex = activeId ? editImages.findIndex((img) => img.id === activeId) : -1;

  // Check if required fields are filled for upload
  const canUpload =
    editDraft &&
    editDraft.student_name.trim() !== "" &&
    editDraft.academic_year.trim() !== "";
  const uploadBlockedReason = !canUpload
    ? "Fill in student name and academic year before uploading images"
    : null;
  const activeImage = useMemo(() => {
    if (!activeId) return null;
    return editImages.find((img) => img.id === activeId) || null;
  }, [editImages, activeId]);

  const dropAnimation = useMemo(
    () => ({
      duration: 180,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      sideEffects: defaultDropAnimationSideEffects({
        styles: {
          active: { opacity: "0" },
        },
      }),
    }),
    []
  );

  return (
    <div className="media-manager">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={editImages.map((img) => img.id)} strategy={rectSortingStrategy}>
          <div className="edit-images-grid">
            {editImages.map((img, idx) => (
              <SortableImageItem
                key={img.id}
                image={img}
                index={idx}
                mainImageId={mainImageId}
                onSetMain={setMainImage}
                onEditCaption={() => setCaptionEditId(img.id)}
                onDeleteClick={() => setConfirmDeleteId(img.id)}
                isConfirmingDelete={confirmDeleteId === img.id}
                isDeleting={deletingId === img.id}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onConfirmDelete={() => handleDeleteConfirm(img.id)}
              />
            ))}

            {/* Upload Button */}
            <button
              type="button"
              className={`upload-tile ${uploadStatus === "uploading" ? "is-uploading" : ""} ${!canUpload ? "is-blocked" : ""}`}
              onClick={canUpload ? handleUploadClick : undefined}
              disabled={uploadStatus === "uploading" || !canUpload}
              title={uploadBlockedReason || undefined}
            >
              {uploadStatus === "uploading" ? (
                <Loader2 className="upload-tile-spinner" size={24} />
              ) : (
                <Plus className="upload-tile-icon" size={24} />
              )}
              <span className="upload-tile-label">
                {uploadStatus === "uploading" ? "Uploading..." : "Add Image"}
              </span>
            </button>
          </div>
        </SortableContext>

        {typeof document === "undefined"
          ? null
          : createPortal(
              <DragOverlay dropAnimation={dropAnimation} zIndex={2000}>
                {activeImage ? (
                  <ImageTile
                    image={activeImage}
                    index={activeIndex === -1 ? 0 : activeIndex}
                    mainImageId={mainImageId}
                    className="edit-image-overlay"
                  />
                ) : null}
              </DragOverlay>,
              document.body
            )}
      </DndContext>

      {/* Upload blocked message */}
      {!canUpload && (
        <div className="upload-blocked-message">
          <AlertCircle size={14} />
          <span>{uploadBlockedReason}</span>
        </div>
      )}

      {/* Upload Error */}
      {uploadStatus === "error" && uploadError && (
        <div className="upload-error">
          <AlertCircle size={14} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Caption Editor Modal */}
      {captionEditId && (
        <CaptionEditor
          imageId={captionEditId}
          currentCaption={editImages.find((img) => img.id === captionEditId)?.caption || ""}
          onSave={(caption) => {
            updateImageCaption(captionEditId, caption);
            setCaptionEditId(null);
          }}
          onClose={() => setCaptionEditId(null)}
        />
      )}
    </div>
  );
}

type CaptionEditorProps = {
  imageId: string;
  currentCaption: string;
  onSave: (caption: string) => void;
  onClose: () => void;
};

function CaptionEditor({ currentCaption, onSave, onClose }: CaptionEditorProps) {
  const [value, setValue] = useState(currentCaption);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(value);
  };

  return (
    <div className="caption-editor-overlay" onClick={onClose}>
      <form className="caption-editor" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="caption-editor-header">
          <h4>Edit Caption</h4>
          <button type="button" className="caption-editor-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <textarea
          className="caption-editor-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter image caption..."
          autoFocus
          rows={3}
        />
        <div className="caption-editor-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

type SortableImageItemProps = {
  image: ProjectImage;
  index: number;
  mainImageId: string;
  onSetMain: (cloudflareId: string) => void;
  onEditCaption: () => void;
  onDeleteClick: () => void;
  isConfirmingDelete: boolean;
  isDeleting: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
};

function SortableImageItem({
  image,
  index,
  mainImageId,
  onSetMain,
  onEditCaption,
  onDeleteClick,
  isConfirmingDelete,
  isDeleting,
  onCancelDelete,
  onConfirmDelete,
}: SortableImageItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <ImageTile
      image={image}
      index={index}
      mainImageId={mainImageId}
      onSetMain={onSetMain}
      onEditCaption={onEditCaption}
      onDeleteClick={onDeleteClick}
      isConfirmingDelete={isConfirmingDelete}
      isDeleting={isDeleting}
      onCancelDelete={onCancelDelete}
      onConfirmDelete={onConfirmDelete}
      className={isDragging ? "is-dragging" : ""}
      style={style}
      ref={setNodeRef}
      dragProps={{ ...attributes, ...listeners }}
    />
  );
}

type ImageTileProps = {
  image: ProjectImage;
  index: number;
  mainImageId: string;
  onSetMain?: (cloudflareId: string) => void;
  onEditCaption?: () => void;
  onDeleteClick?: () => void;
  isConfirmingDelete?: boolean;
  isDeleting?: boolean;
  onCancelDelete?: () => void;
  onConfirmDelete?: () => void;
  className?: string;
  style?: CSSProperties;
  dragProps?: HTMLAttributes<HTMLDivElement>;
};

const ImageTile = forwardRef<HTMLDivElement, ImageTileProps>(function ImageTile(
  {
    image,
    index,
    mainImageId,
    onSetMain,
    onEditCaption,
    onDeleteClick,
    isConfirmingDelete,
    isDeleting,
    onCancelDelete,
    onConfirmDelete,
    className,
    style,
    dragProps,
  },
  ref
) {
  const isMain = mainImageId === image.cloudflare_id;

  return (
    <div
      ref={ref}
      style={style}
      className={`edit-image-item ${isMain ? "is-main" : ""} ${className || ""}`}
      {...dragProps}
    >
      <img
        src={`https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/${image.cloudflare_id}/thumb`}
        alt={`Image ${index + 1}`}
        loading="lazy"
      />
      <span className="edit-image-order">{index + 1}</span>
      {isMain && <span className="edit-image-badge">Main</span>}

      {/* Deleting overlay */}
      {isDeleting && (
        <div className="delete-progress-overlay">
          <Loader2 className="delete-progress-spinner" size={20} />
        </div>
      )}

      {/* Delete confirmation overlay */}
      {isConfirmingDelete && !isDeleting && (
        <div className="delete-confirm-overlay">
          <span className="delete-confirm-text">Delete?</span>
          <div className="delete-confirm-actions">
            <button
              type="button"
              className="delete-confirm-btn delete-confirm-yes"
              onClick={(e) => {
                e.stopPropagation();
                onConfirmDelete?.();
              }}
            >
              Yes
            </button>
            <button
              type="button"
              className="delete-confirm-btn delete-confirm-no"
              onClick={(e) => {
                e.stopPropagation();
                onCancelDelete?.();
              }}
            >
              No
            </button>
          </div>
        </div>
      )}

      {/* Action buttons - hide during delete confirmation or deleting */}
      {!isConfirmingDelete && !isDeleting && onSetMain && (
        <div className="edit-image-actions">
          <button
            type="button"
            className="edit-image-action"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onSetMain(image.cloudflare_id)}
            title="Set as main image"
          >
            <Star size={10} />
          </button>
          <button
            type="button"
            className="edit-image-action"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onEditCaption}
            title="Edit caption"
          >
            <Type size={10} />
          </button>
          <button
            type="button"
            className="edit-image-action edit-image-action-delete"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onDeleteClick}
            title="Delete image"
          >
            <Trash2 size={10} />
          </button>
        </div>
      )}

      {image.caption && !isConfirmingDelete && !isDeleting && (
        <span className="edit-image-caption">{image.caption}</span>
      )}
    </div>
  );
});
