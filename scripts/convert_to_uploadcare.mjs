// Convert all existing image links to Uploadcare CDN links.

import { stat, readdir, readFile, writeFile } from 'fs/promises';
import { basename } from 'path';
import fm from 'front-matter';
import yaml from 'js-yaml';
import dotenv from 'dotenv';

dotenv.config();

const UPLOADCARE_CACHE_FILE = 'uploadcare-files.json';
const UPLOADCARE_CACHE_MAX_AGE = 1000 * 60 * 60 * 24;
let uploadcareFiles = [];

async function getAllFilesOnUploadcare() {
	try {
		const cacheStat = await stat(UPLOADCARE_CACHE_FILE);
		if (cacheStat.isFile() && cacheStat.mtimeMs > Date.now() - UPLOADCARE_CACHE_MAX_AGE) {
			uploadcareFiles = JSON.parse(await readFile(UPLOADCARE_CACHE_FILE, 'utf8'));
			return uploadcareFiles;
		}
	} catch (e) {
		console.log(e);
	}
	const response = await fetch(`https://api.uploadcare.com/files/?limit=1000`, {
		method: 'GET',
		headers: {
			Accept: 'application/vnd.uploadcare-v0.5+json',
			Authorization: `Uploadcare.Simple ${process.env.UPLOADCARE_PUBLIC_KEY}:${process.env.UPLOADCARE_SECRET_KEY}`
		}
	});
	const json = await response.json();
	if (!response.ok) {
		throw new Error(`Error getting files from Uploadcare: ${json.detail}`);
	}
	const results = json.results;
	writeFile(UPLOADCARE_CACHE_FILE, JSON.stringify(results));
	return results;
}

async function findFileOnUploadcare(filename) {
	if (filename.startsWith('https://ucarecdn.com/')) return filename;
	filename = basename(filename);
	// console.log(filename);
	const result = uploadcareFiles.find((file) => file.original_filename === filename);
	if (!result) {
		throw new Error(`Could not find file ${filename} on Uploadcare`);
	}
	return `https://ucarecdn.com/${result.uuid}/`;
}

async function convertStudentPage(filename) {
	// Load the file
	const fullFilename = `2023/students/${filename}`;
	const text = await readFile(fullFilename, 'utf8');

	// Parse the front matter
	const { attributes, body } = fm(text);

	// Convert all images (main image and images)
	attributes.main_image = await findFileOnUploadcare(attributes.main_image);
	if (attributes.images) {
		for (let i = 0; i < attributes.images.length; i++) {
			attributes.images[i] = await findFileOnUploadcare(attributes.images[i]);
		}
	}

	// Create the new page.
	let page = '';
	page += '---\n';
	page += yaml.dump(attributes);
	page += '---\n';
	page += body;

	// Save over the existing page.
	await writeFile(fullFilename, page);
}

export async function main() {
	await getAllFilesOnUploadcare();
	let files = await readdir('2023/students');
	files = files.filter((file) => file.endsWith('.md'));

	for (const filename of files) {
		console.log(`Converting ${filename}`);
		await convertStudentPage(filename);
	}
}

main();
