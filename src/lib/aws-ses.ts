// AWS SES API client using Signature V4
// Lightweight implementation for Cloudflare Workers

export interface SESConfig {
	accessKeyId: string;
	secretAccessKey: string;
	region: string;
}

export interface SendEmailParams {
	from: string;
	to: string;
	subject: string;
	html: string;
	text: string;
	configurationSetName?: string;
}

export interface SESResult {
	success: boolean;
	messageId?: string;
	error?: string;
	errorCode?: string;
	requestId?: string;
}

const SERVICE = 'ses';
const ALGORITHM = 'AWS4-HMAC-SHA256';

async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		key,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function sha256(message: string): Promise<string> {
	const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
	return arrayBufferToHex(hash);
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

async function getSignatureKey(
	secretKey: string,
	dateStamp: string,
	region: string,
	service: string
): Promise<ArrayBuffer> {
	const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + secretKey), dateStamp);
	const kRegion = await hmacSha256(kDate, region);
	const kService = await hmacSha256(kRegion, service);
	return hmacSha256(kService, 'aws4_request');
}

function getAmzDate(): { amzDate: string; dateStamp: string } {
	const now = new Date();
	const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
	const dateStamp = amzDate.slice(0, 8);
	return { amzDate, dateStamp };
}

export async function sendEmail(config: SESConfig, params: SendEmailParams): Promise<SESResult> {
	const { accessKeyId, secretAccessKey, region } = config;
	const host = `email.${region}.amazonaws.com`;
	const endpoint = `https://${host}/`;

	// Build request body (form-urlencoded)
	const bodyParams: Record<string, string> = {
		Action: 'SendEmail',
		Version: '2010-12-01',
		'Source': params.from,
		'Destination.ToAddresses.member.1': params.to,
		'Message.Subject.Data': params.subject,
		'Message.Subject.Charset': 'UTF-8',
		'Message.Body.Html.Data': params.html,
		'Message.Body.Html.Charset': 'UTF-8',
		'Message.Body.Text.Data': params.text,
		'Message.Body.Text.Charset': 'UTF-8',
	};

	if (params.configurationSetName) {
		bodyParams.ConfigurationSetName = params.configurationSetName;
	}

	const body = new URLSearchParams(bodyParams).toString();

	const { amzDate, dateStamp } = getAmzDate();
	const payloadHash = await sha256(body);

	// Canonical request
	const canonicalHeaders = [
		`content-type:application/x-www-form-urlencoded`,
		`host:${host}`,
		`x-amz-date:${amzDate}`,
	].join('\n') + '\n';

	const signedHeaders = 'content-type;host;x-amz-date';

	const canonicalRequest = [
		'POST',
		'/',
		'',
		canonicalHeaders,
		signedHeaders,
		payloadHash,
	].join('\n');

	// String to sign
	const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;
	const stringToSign = [
		ALGORITHM,
		amzDate,
		credentialScope,
		await sha256(canonicalRequest),
	].join('\n');

	// Calculate signature
	const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, SERVICE);
	const signature = arrayBufferToHex(await hmacSha256(signingKey, stringToSign));

	// Authorization header
	const authorization = `${ALGORITHM} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

	// Make request
	try {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'X-Amz-Date': amzDate,
				'Authorization': authorization,
			},
			body,
		});

		const responseText = await response.text();

		if (response.ok) {
			// Parse success response
			const messageIdMatch = responseText.match(/<MessageId>([^<]+)<\/MessageId>/);
			const requestIdMatch = responseText.match(/<RequestId>([^<]+)<\/RequestId>/);

			return {
				success: true,
				messageId: messageIdMatch?.[1],
				requestId: requestIdMatch?.[1],
			};
		} else {
			// Parse error response
			const errorCodeMatch = responseText.match(/<Code>([^<]+)<\/Code>/);
			const errorMessageMatch = responseText.match(/<Message>([^<]+)<\/Message>/);
			const requestIdMatch = responseText.match(/<RequestId>([^<]+)<\/RequestId>/);

			const errorCode = errorCodeMatch?.[1] || 'Unknown';
			const errorMessage = errorMessageMatch?.[1] || responseText;

			console.error('SES API Error:', {
				status: response.status,
				errorCode,
				errorMessage,
				requestId: requestIdMatch?.[1],
				to: params.to,
			});

			return {
				success: false,
				error: errorMessage,
				errorCode,
				requestId: requestIdMatch?.[1],
			};
		}
	} catch (err) {
		const error = err instanceof Error ? err.message : 'Unknown error';
		console.error('SES request failed:', error);
		return {
			success: false,
			error,
			errorCode: 'NetworkError',
		};
	}
}
