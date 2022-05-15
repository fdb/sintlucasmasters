// SvelteKit endpoint for fetching student data.
// https://kit.svelte.dev/docs/routing#endpoints

import { readFile } from 'fs/promises';
import fm from 'front-matter';

export async function get({ params }) {
	const text = await readFile(`data/students/${params.name}.md`, 'utf8');
	const { attributes, body } = fm(text);
	return {
		body: { attributes, body }
	};
}
