import type { FC } from 'hono/jsx';
import type { Project } from '../types';
import { getImageUrl } from '../types';

type ProjectCardProps = {
	project: Project;
};

export const ProjectCard: FC<ProjectCardProps> = ({ project }) => {
	const imageId = project.thumb_image_id || project.main_image_id;
	const imageUrl = getImageUrl(imageId, 'thumb');

	return (
		<a href={`/project/${project.id}`} class="card" style="text-decoration: none;">
			<img src={imageUrl} alt={project.project_title} loading="lazy" />
			<h2>{project.student_name}</h2>
			<p>{project.project_title}</p>
		</a>
	);
};
