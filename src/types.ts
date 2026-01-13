export interface Project {
	id: string;
	student_name: string;
	project_title: string;
	context: string;
	academic_year: string;
	bio: string | null;
	description: string;
	main_image_id: string;
	thumb_image_id: string | null;
	tags: string | null;
	social_links: string | null;
	status: string;
	created_at: string;
	updated_at: string;
}

export interface ProjectImage {
	id: string;
	project_id: string;
	cloudflare_id: string;
	sort_order: number;
	caption: string | null;
}

export const CONTEXTS = [
	'Autonomous Context',
	'Applied Context',
	'Digital Context',
	'Socio-Political Context',
	'Jewelry Context',
] as const;

export type Context = (typeof CONTEXTS)[number];

// Cloudflare Images URL helper
const CF_ACCOUNT_HASH = '7-GLn6-56OyK7JwwGe0hfg';

export function getImageUrl(imageId: string, variant: 'thumb' | 'medium' | 'large' = 'medium'): string {
	return `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${imageId}/${variant}`;
}
