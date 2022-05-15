// Get the list of all students.

import { readdir, readFile } from 'fs/promises';
import fm from 'front-matter';

export async function get({ params }) {
	let files = await readdir('data/students');
	files = files.filter((file) => file.endsWith('.md'));

	const students = await Promise.all(
		files.map(async (file) => {
			const text = await readFile(`data/students/${file}`, 'utf8');
			const { attributes } = fm(text);
			return attributes;
		})
	);
	return {
		body: { students }
	};
}
