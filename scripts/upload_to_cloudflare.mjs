// Take all files in _uploads and upload the to Cloudflare.
// We use the same file names as the original filenames for Cloudflare.
// Note that the files are in a subdirectory of _uploads, keyed under the slug (name) of the student.
import { read } from 'fs';
import { createReadStream } from 'fs';
import { readdir, readFile, writeFile } from 'fs/promises';
import FormData from 'form-data';
import 'dotenv/config';

const UPLOADS_DIR = '_uploads';
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_ACCOUNT_HASH = process.env.CLOUDFLARE_ACCOUNT_HASH;
const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;
if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_ACCOUNT_HASH || !CLOUDFLARE_API_KEY) {
	throw new Error('Missing CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ACCOUNT_HASH or CLOUDFLARE_API_KEY in .env file.');
}

async function uploadToCloudflare(relativeFilename) {
	const filename = `${UPLOADS_DIR}/${relativeFilename}`;

	const buffer = await readFile(filename);
	const form = new FormData();
	form.append('id', relativeFilename);
	form.append('file', buffer);

	const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${CLOUDFLARE_API_KEY}`,
			...form.getHeaders()
		},
		body: form.getBuffer()
	});
	if (!res.ok) {
		throw new Error(`Failed to upload ${filename}: ${res.status} ${res.statusText}`);
	}
	const json = await res.json();
	if (!json.success) {
		throw new Error(`Failed to upload ${filename}: ${json.errors}`);
	}
}

async function checkCloudflareImage(relativeFilename) {
	const url = `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${relativeFilename}/thumb`;
	const res = await fetch(url);
	return res.ok;
}

async function main() {
	const studentDirs = await readdir(UPLOADS_DIR);
	for (const studentDir of studentDirs) {
		const studentImages = await readdir(`${UPLOADS_DIR}/${studentDir}`);
		for (const studentImage of studentImages) {
			const relativeFilename = `${studentDir}/${studentImage}`;
			console.log(relativeFilename);
			if (!(await checkCloudflareImage(relativeFilename))) {
				await uploadToCloudflare(relativeFilename);
			} else {
				console.log('File exists, skipping...');
			}
		}
	}
}

main();
