import type { DragEvent } from "react";
import { Star } from "lucide-react";
import { useAdminStore } from "../store/adminStore";

export function EditImagesGrid() {
  const { editImages, editDraft, draggedImageId, setDraggedImageId, reorderImages, setMainImage } = useAdminStore(
    (state) => ({
      editImages: state.editImages,
      editDraft: state.editDraft,
      draggedImageId: state.draggedImageId,
      setDraggedImageId: state.setDraggedImageId,
      reorderImages: state.reorderImages,
      setMainImage: state.setMainImage,
    })
  );

  const handleDragStart = (e: DragEvent<HTMLDivElement>, imageId: string) => {
    setDraggedImageId(imageId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    reorderImages(targetId);
  };

  const mainImageId = editDraft?.main_image_id || "";

  return (
    <div className="edit-images-grid">
      {editImages.map((img, idx) => (
        <div
          key={img.id}
          className={`edit-image-item ${draggedImageId === img.id ? "dragging" : ""} ${
            mainImageId === img.cloudflare_id ? "is-main" : ""
          }`}
          draggable
          onDragStart={(e) => handleDragStart(e, img.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, img.id)}
        >
          <img
            src={`https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/${img.cloudflare_id}/thumb`}
            alt={`Image ${idx + 1}`}
            loading="lazy"
          />
          <span className="edit-image-order">{idx + 1}</span>
          {mainImageId === img.cloudflare_id && <span className="edit-image-badge">Main</span>}
          <div className="edit-image-actions">
            <button
              type="button"
              className="edit-image-action"
              onClick={() => setMainImage(img.cloudflare_id)}
              title="Set as main image"
            >
              <Star size={10} />
            </button>
          </div>
          {img.caption && <span className="edit-image-caption">{img.caption}</span>}
        </div>
      ))}
    </div>
  );
}
