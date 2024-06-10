// Automatically download all image uploads from the Google Drive links in the CSV file
// Usage: node scripts/download_image_uploads.mjs <filename>
// Example: node scripts/download_image_uploads.mjs _data/2021.csv
// This script will create a _uploads directory and download all images to it.
// This will not always work because Google Drive will block the download if it detects too many requests.

import { stat, readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { csvParse } from 'd3-dsv';
import slugify from 'slugify';

async function parseCsvFile(filename) {
	const text = await readFile(filename, 'utf8');
	let rows = csvParse(text);
	// Check all required fields are present
	const requiredFields = ['name', 'project_title', 'context', 'summary', 'description', 'website', 'instagram', 'main_image'];
	for (const field of requiredFields) {
		if (!rows[0][field]) {
			throw new Error(`Missing field: ${field}`);
		}
	}
	// Remove test submissions
	rows = rows.filter((row) => row.title !== 'test');
	return rows;
}

async function parseDriveImagePage(url) {
	const res = await fetch(url);
	const html = await res.text();
	const imageConfigIndex = html.indexOf('window.viewerData = {config: '); // {'id': '1kXARDHTSndAt14TLyAjjyI_7TpywVlwG', 'title': 'Rino_Vranken_boots - Rino Vranken.jpg'')
	const imageConfigLastIndex = html.indexOf('}', imageConfigIndex);
	let snippet = html.slice(imageConfigIndex + 29, imageConfigLastIndex + 1);
	snippet = snippet.replace(/^{|}$/g, '').trim();
	let pairs = snippet.match(/'[^']*':\s*[^,]+/g);
	let config = {};
	pairs.forEach((pair) => {
		let [key, value] = pair.split(/:\s*/);

		// Remove single quotes around keys
		key = key.replace(/'/g, '');

		// Handle boolean and null values
		if (value === 'true') {
			value = true;
		} else if (value === 'false') {
			value = false;
		} else if (value === 'null') {
			value = null;
		} else {
			// Remove single quotes around string values
			value = value.replace(/^'|'$/g, '');
		}

		// Assign the key-value pair to the object
		config[key] = value;
	});
	return config;
}

async function ensureDirectory(dir) {
	try {
		await mkdir(dir, { recursive: true });
	} catch (err) {
		if (err.code !== 'EEXIST') {
			throw err;
		}
	}
}

async function downloadImageFromGoogleDrive(url, slug, prefix = '') {
	// Check that the link starts with https://drive.google.com/file/d/
	const GOOGLE_DRIVE_URL_PREFIX = 'https://drive.google.com/open?id=';
	if (!url.startsWith(GOOGLE_DRIVE_URL_PREFIX)) {
		console.warn(`Invalid link ${url}`);
	}

	// Get the file ID
	const fileId = url.slice(GOOGLE_DRIVE_URL_PREFIX.length);
	console.log(fileId);

	// Get the file name
	const fileConfig = await parseDriveImagePage(url);
	let fileSlug = slugify(fileConfig.title, { lower: true });
	// fileSlug.replace(slug.replace('-', '_') + '_', '');
	// fileSlug.replace('-' + slug, '');
	// fileSlug = prefix + fileSlug;
	// fileSlug = slug + '_' + fileSlug;
	console.log(fileSlug);
	const fileExtension = fileConfig.title.split('.').pop().toLowerCase();

	// Download the file
	const exportUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;

	const res = await fetch(exportUrl);
	const buffer = await res.arrayBuffer();
	const data = new Uint8Array(buffer);
	await ensureDirectory(`_uploads/${slug}`);
	await writeFile(`_uploads/${slug}/${fileId}.${fileExtension}`, data);
}

async function processStudent(student) {
	const slug = slugify(student.name, { lower: true });
	console.log(student.name, slug);

	// Check for the main image
	await downloadImageFromGoogleDrive(student.main_image, slug);

	// Check for the additional images
	for (const image of student.images.split(',')) {
		await downloadImageFromGoogleDrive(image.trim(), slug);
	}
}

export async function main() {
	// Get the file argument from the command line
	const argv = process.argv.slice(2);
	if (argv.length !== 1) {
		console.error('Usage: node scripts/csv_to_markdown.js <filename>');
		process.exit(1);
	}

	// Parse the CSV file
	const filename = argv[0];
	const students = await parseCsvFile(filename);

	// Make _uploads directory if it doesn't exist
	try {
		await stat('_uploads');
	} catch (err) {
		await mkdir('_uploads');
	}

	// Process all students
	for (const student of students) {
		await processStudent(student);
	}
}

main();
