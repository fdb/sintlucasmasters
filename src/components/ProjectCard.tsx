import type { FC } from "hono/jsx";
import type { Project } from "../types";
import { getImageUrl, getStudentUrl } from "../types";

type ProjectCardProps = {
  project: Project;
  showYear?: boolean;
};

export const ProjectCard: FC<ProjectCardProps> = ({ project, showYear }) => {
  const imageId = project.thumb_image_id || project.main_image_id;
  const imageUrl = getImageUrl(imageId, "thumb");

  return (
    <a href={getStudentUrl(project)} class="card">
      {imageUrl ? (
        <img src={imageUrl} alt={project.project_title} loading="lazy" class="card-image" />
      ) : (
        <div class="card-image card-image-placeholder" />
      )}
      <div class="card-header">
        <h2 class="card-title">{project.student_name}</h2>
        {showYear && <span class="card-year">{project.academic_year}</span>}
      </div>
      <p class="card-subtitle">{project.project_title}</p>
    </a>
  );
};
