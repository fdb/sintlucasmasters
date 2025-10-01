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
	// Extract file ID from various Google Drive URL formats
	let fileId;
	if (url.includes('/open?id=')) {
		fileId = url.split('/open?id=')[1];
	} else if (url.includes('/file/d/')) {
		fileId = url.split('/file/d/')[1].split('/')[0];
	} else {
		console.warn(`Invalid Google Drive link: ${url}`);
		return;
	}

	console.log(`Downloading file ID: ${fileId}`);

	// Try direct download without fetching metadata
	const exportUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

	const res = await fetch(exportUrl);

	// Check if we got redirected or got an error
	if (!res.ok) {
		console.error(`Failed to download ${fileId}: ${res.status} ${res.statusText}`);
		return;
	}

	// Try to get file extension from Content-Disposition header or Content-Type
	const contentDisposition = res.headers.get('content-disposition');
	const contentType = res.headers.get('content-type');
	let fileExtension = null;

	if (contentDisposition) {
		const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
		if (filenameMatch && filenameMatch[1]) {
			const originalFilename = filenameMatch[1].replace(/['"]/g, '');
			const ext = originalFilename.split('.').pop().toLowerCase();
			if (ext && ext.length <= 4) {
				fileExtension = ext;
			}
		}
	}

	if (!fileExtension && contentType) {
		// Fallback to content-type
		const typeMap = {
			'image/jpeg': 'jpg',
			'image/jpg': 'jpg',
			'image/png': 'png',
			'image/gif': 'gif',
			'image/webp': 'webp',
			'image/heic': 'heic',
			'image/heif': 'heif'
		};
		fileExtension = typeMap[contentType];
	}

	// Final fallback
	if (!fileExtension) {
		fileExtension = 'jpg';
	}

	const filename = `${fileId}.${fileExtension}`;
	console.log(`Saving as: ${filename}`);

	const buffer = await res.arrayBuffer();
	const data = new Uint8Array(buffer);
	await ensureDirectory(`_uploads/${slug}`);
	await writeFile(`_uploads/${slug}/${filename}`, data);
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
