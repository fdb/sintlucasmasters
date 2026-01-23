import { useMemo, useState, forwardRef, type CSSProperties, type HTMLAttributes } from "react";
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
import { Star } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import type { ProjectImage } from "../store/adminStore";

export function EditImagesGrid() {
  const { editImages, editDraft, moveEditImage, setMainImage } = useAdminStore((state) => ({
    editImages: state.editImages,
    editDraft: state.editDraft,
    moveEditImage: state.moveEditImage,
    setMainImage: state.setMainImage,
  }));
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const mainImageId = editDraft?.main_image_id || "";
  const activeIndex = activeId ? editImages.findIndex((img) => img.id === activeId) : -1;
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
          active: {
            opacity: "0",
          },
        },
      }),
    }),
    []
  );

  return (
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
            />
          ))}
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
  );
}

type SortableImageItemProps = {
  image: ProjectImage;
  index: number;
  mainImageId: string;
  onSetMain: (cloudflareId: string) => void;
};

function SortableImageItem({ image, index, mainImageId, onSetMain }: SortableImageItemProps) {
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
  className?: string;
  style?: CSSProperties;
  dragProps?: HTMLAttributes<HTMLDivElement>;
};

const ImageTile = forwardRef<HTMLDivElement, ImageTileProps>(function ImageTile(
  { image, index, mainImageId, onSetMain, className, style, dragProps },
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
      {onSetMain && (
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
        </div>
      )}
      {image.caption && <span className="edit-image-caption">{image.caption}</span>}
    </div>
  );
});
