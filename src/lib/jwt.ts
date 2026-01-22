// JWT utilities for authentication
// Uses Web Crypto API (available in Cloudflare Workers)

import type { UserRole } from '../types';

export interface JWTPayload {
	userId: string;
	email: string;
	role: UserRole;
	exp: number;
	iat: number;
}

const ALGORITHM = { name: 'HMAC', hash: 'SHA-256' };
const JWT_EXPIRY_DAYS = 7;

async function getKey(secret: string): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	return crypto.subtle.importKey('raw', encoder.encode(secret), ALGORITHM, false, ['sign', 'verify']);
}

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
	const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
	const padded = str.replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

export async function signToken(
	payload: { userId: string; email: string; role: UserRole },
	secret: string
): Promise<string> {
	const header = { alg: 'HS256', typ: 'JWT' };
	const now = Math.floor(Date.now() / 1000);
	const fullPayload: JWTPayload = {
		...payload,
		iat: now,
		exp: now + JWT_EXPIRY_DAYS * 24 * 60 * 60,
	};

	const encoder = new TextEncoder();
	const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
	const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(fullPayload)));
	const message = `${headerB64}.${payloadB64}`;

	const key = await getKey(secret);
	const signature = await crypto.subtle.sign(ALGORITHM, key, encoder.encode(message));
	const signatureB64 = base64UrlEncode(signature);

	return `${message}.${signatureB64}`;
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) {
			return null;
		}

		const [headerB64, payloadB64, signatureB64] = parts;
		const message = `${headerB64}.${payloadB64}`;

		const key = await getKey(secret);
		const encoder = new TextEncoder();
		const signature = base64UrlDecode(signatureB64);

		const valid = await crypto.subtle.verify(ALGORITHM, key, signature, encoder.encode(message));
		if (!valid) {
			return null;
		}

		const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
		const payload = JSON.parse(payloadJson) as JWTPayload;

		// Check expiration
		const now = Math.floor(Date.now() / 1000);
		if (payload.exp < now) {
			return null;
		}

		return payload;
	} catch {
		return null;
	}
}
