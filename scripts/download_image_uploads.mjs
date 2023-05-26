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

async function downloadImageFromGoogleDrive(url, slug) {
	// Check that the link starts with https://drive.google.com/file/d/
	const GOOGLE_DRIVE_URL_PREFIX = 'https://drive.google.com/open?id=';
	if (!url.startsWith(GOOGLE_DRIVE_URL_PREFIX)) {
		console.warn(`Invalid link ${url}`);
	}

	// Get the file ID
	const fileId = url.slice(GOOGLE_DRIVE_URL_PREFIX.length);
	console.log(fileId);
	// Download the file
	const exportUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;

	const res = await fetch(exportUrl);
	const buffer = await res.arrayBuffer();
	const data = new Uint8Array(buffer);
	writeFile(`_uploads/${slug}.jpg`, data);
}

async function processStudent(student) {
	const slug = slugify(student.name, { lower: true });
	console.log(student.name, slug);

	// Check for the main image
	await downloadImageFromGoogleDrive(student.main_image, slug);
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
