import { Hono } from 'hono';
import { Layout } from './components/Layout';
import { ProjectCard } from './components/ProjectCard';
import type { Project, ProjectImage } from './types';
import { CONTEXTS, getImageUrl } from './types';

type Bindings = {
	DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Current academic year
const CURRENT_YEAR = '2024-2025';

// Home page - current year projects
app.get('/', async (c) => {
	const context = c.req.query('context');

	let query = 'SELECT * FROM projects WHERE academic_year = ?';
	const params: string[] = [CURRENT_YEAR];

	if (context && CONTEXTS.includes(context as any)) {
		query += ' AND context = ?';
		params.push(context);
	}

	query += ' ORDER BY student_name';

	const { results: projects } = await c.env.DB.prepare(query)
		.bind(...params)
		.all<Project>();

	return c.html(
		<Layout title="2024-2025">
			<div class="filters">
				<a href="/" class={!context ? 'active' : ''}>
					All
				</a>
				{CONTEXTS.map((ctx) => (
					<a href={`/?context=${encodeURIComponent(ctx)}`} class={context === ctx ? 'active' : ''}>
						{ctx.replace(' Context', '')}
					</a>
				))}
			</div>
			<div class="grid">
				{projects.map((project) => (
					<ProjectCard project={project} />
				))}
			</div>
			{projects.length === 0 && <p>No projects found.</p>}
		</Layout>
	);
});

// Archive page - all years
app.get('/archive', async (c) => {
	const year = c.req.query('year');
	const context = c.req.query('context');

	// Get available years
	const { results: yearResults } = await c.env.DB.prepare(
		'SELECT DISTINCT academic_year FROM projects ORDER BY academic_year DESC'
	).all<{ academic_year: string }>();

	const years = yearResults.map((r) => r.academic_year);
	const selectedYear = year || years[0];

	let query = 'SELECT * FROM projects WHERE academic_year = ?';
	const params: string[] = [selectedYear];

	if (context && CONTEXTS.includes(context as any)) {
		query += ' AND context = ?';
		params.push(context);
	}

	query += ' ORDER BY student_name';

	const { results: projects } = await c.env.DB.prepare(query)
		.bind(...params)
		.all<Project>();

	return c.html(
		<Layout title={`Archive - ${selectedYear}`}>
			<h2>Archive</h2>
			<div class="filters">
				{years.map((y) => (
					<a
						href={`/archive?year=${encodeURIComponent(y)}${context ? `&context=${encodeURIComponent(context)}` : ''}`}
						class={selectedYear === y ? 'active' : ''}
					>
						{y}
					</a>
				))}
			</div>
			<div class="filters">
				<a href={`/archive?year=${encodeURIComponent(selectedYear)}`} class={!context ? 'active' : ''}>
					All
				</a>
				{CONTEXTS.map((ctx) => (
					<a
						href={`/archive?year=${encodeURIComponent(selectedYear)}&context=${encodeURIComponent(ctx)}`}
						class={context === ctx ? 'active' : ''}
					>
						{ctx.replace(' Context', '')}
					</a>
				))}
			</div>
			<div class="grid">
				{projects.map((project) => (
					<ProjectCard project={project} />
				))}
			</div>
			{projects.length === 0 && <p>No projects found.</p>}
		</Layout>
	);
});

// Project detail page
app.get('/project/:id', async (c) => {
	const id = c.req.param('id');

	const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<Project>();

	if (!project) {
		return c.html(
			<Layout title="Not Found">
				<p>Project not found.</p>
				<a href="/">Back to home</a>
			</Layout>,
			404
		);
	}

	const { results: images } = await c.env.DB.prepare(
		'SELECT * FROM project_images WHERE project_id = ? ORDER BY sort_order'
	)
		.bind(id)
		.all<ProjectImage>();

	const socialLinks: string[] = project.social_links ? JSON.parse(project.social_links) : [];
	const tags: string[] = project.tags ? JSON.parse(project.tags) : [];

	return c.html(
		<Layout title={`${project.student_name} - ${project.project_title}`}>
			<a href="/" class="back-link">
				← Back
			</a>
			<div class="project-detail">
				<h1>{project.student_name}</h1>
				<p class="meta">
					{project.project_title} · {project.context} · {project.academic_year}
				</p>
				<img src={getImageUrl(project.main_image_id, 'large')} alt={project.project_title} class="main-image" />
				{project.bio && (
					<div>
						<h3>Bio</h3>
						<p class="description">{project.bio}</p>
					</div>
				)}
				<div>
					<h3>About the project</h3>
					<p class="description">{project.description}</p>
				</div>
				{tags.length > 0 && (
					<p>
						<strong>Tags:</strong> {tags.join(', ')}
					</p>
				)}
				{images.length > 0 && (
					<div>
						<h3>Gallery</h3>
						<div class="gallery">
							{images.map((img) => (
								<img src={getImageUrl(img.cloudflare_id, 'medium')} alt="" loading="lazy" />
							))}
						</div>
					</div>
				)}
				{socialLinks.length > 0 && (
					<div class="links">
						<h3>Links</h3>
						{socialLinks.map((link) => (
							<a href={link} target="_blank" rel="noopener noreferrer">
								{new URL(link).hostname}
							</a>
						))}
					</div>
				)}
			</div>
		</Layout>
	);
});

export default app;
