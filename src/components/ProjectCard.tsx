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
  const vtName = `student-${project.slug}`;

  return (
    <a href={getStudentUrl(project)} class="card">
      {imageUrl ? (
        <img src={imageUrl} alt={project.project_title} loading="lazy" class="card-image" />
      ) : (
        <div class="card-image card-image-placeholder" />
      )}
      <div class="card-body">
        <h2 class="card-title" style={`view-transition-name: name-${vtName}`}>
          {project.student_name}
        </h2>
        <p class="card-subtitle" style={`view-transition-name: title-${vtName}`}>
          {project.project_title}
        </p>
        {showYear && <span class="card-year">{project.academic_year}</span>}
      </div>
    </a>
  );
};
