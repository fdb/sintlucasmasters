// Convert student's submissions to Markdown files.

import { stat, readdir, readFile, writeFile } from 'fs/promises';
import { csvParse } from 'd3-dsv';
import slugify from 'slugify';

async function parseCsvFile(filename) {
	const text = await readFile(filename, 'utf8');
	let rows = csvParse(text);
	// Check all required fields are present
	const requiredFields = ['name', 'project_title', 'context', 'summary', 'description', 'website', 'instagram'];
	for (const field of requiredFields) {
		if (!rows[0][field]) {
			throw new Error(`Missing field: ${field}`);
		}
	}
	// Remove test submissions
	rows = rows.filter((row) => row.title !== 'test');
	return rows;
}

const CONTEXT_MAP = {
	'Premaster Autonome Context / Autonomous Context': 'Autonomous Context',
	'Premaster Digitale Context / Digital Context': 'Applied Context',
	'Premaster Socio-politieke Context / Socio-political Context': 'Socio-Political Context',
	'Premaster Toegepaste Context / Applied Context': 'Applied Context',
	'Master Socio-politieke Context / Socio-political Context': 'Socio-Political Context',
	'Master Digitale Context / Digital Context': 'Digital Context',
	'Master Autonome Context / Autonomous Context': 'Autonomous Context',
	'Master Toegepaste Context / Applied Context': 'Applied Context',
	'Master Sieraad Context / Jewelry Context': 'Jewelry Context'
};

async function createJsonLayoutFile() {
	const filename = '2023/students/students.json';
	const text = `{ "layout": "student.liquid" }`;
	await writeFile(filename, text);
}

async function processStudent(student) {
	console.log(student);
	const slug = slugify(student.name, { lower: true });

	console.log(student.name, slug);
	const context = CONTEXT_MAP[student.context];
	if (!context) {
		throw new Error(`Unknown context: ${student.context}`);
	}
	let md = '---\n';
	md += `student_name: "${student.name}"\n`;
	md += `project_title: "${student.project_title}"\n`;
	md += `context: ${context}\n`;
	md += `year: 2022-2023\n`;
	md += `main_image: ${slug}.jpg\n`;
	md += `social_links:\n`;
	if (student.website) {
		md += `  - "${student.website}"\n`;
	}
	if (student.instagram) {
		const handleWithoutAt = student.instagram.startsWith('@') ? student.instagram.slice(1) : student.instagram;
		const instagramLink = student.instagram.startsWith('@') ? `https://www.instagram.com/${student.instagram.slice(1)}` : student.instagram;
		md += `  - "https://www.instagram.com/${student.instagram}"\n`;
	}
	md += '---\n';
	md += `${student.summary}`;
	md += '\n\n';
	md += `${student.description}`;

	const filename = `2023/students/${slug}.md`;
	await writeFile(filename, md);
}

export async function main() {
	// Get the file argument from the command line
	const argv = process.argv.slice(2);
	if (argv.length !== 1) {
		console.error('Usage: node scripts/csv_to_markdown.js <filename>');
		process.exit(1);
	}
	const filename = argv[0];
	const students = await parseCsvFile(filename);
	for (const student of students) {
		await processStudent(student);
	}
	await createJsonLayoutFile();
	// console.log(students);
	// await getAllFilesOnUploadcare();
	// let files = await readdir('data/students');
	// files = files.filter((file) => file.endsWith('.md'));

	// for (const filename of files) {
	// 	console.log(`Converting ${filename}`);
	// 	await convertStudentPage(filename);
	// }
}

main();
