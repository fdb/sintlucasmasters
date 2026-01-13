const ACCOUNT_ID = '40728e030c0e1a608b66d84b0de7ac62';
const DIRECT_UPLOAD_ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v2/direct_upload`;

exports.handler = async () => {
	try {
		if (!process.env.CLOUDFLARE_API_KEY) {
			return {
				statusCode: 500,
				body: JSON.stringify({ error: 'Missing CLOUDFLARE_API_KEY environment variable' })
			};
		}

		const response = await fetch(DIRECT_UPLOAD_ENDPOINT, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.CLOUDFLARE_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				requireSignedURLs: false
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			return {
				statusCode: response.status,
				body: errorText
			};
		}

		const json = await response.json();

		if (!json.success) {
			return {
				statusCode: 502,
				body: JSON.stringify({ error: 'Cloudflare upload request failed', details: json.errors || [] })
			};
		}

		return {
			statusCode: 200,
			body: JSON.stringify({
				id: json.result.id,
				uploadURL: json.result.uploadURL
			})
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Unexpected error creating Cloudflare direct upload', details: error.message })
		};
	}
};
