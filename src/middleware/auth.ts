// Authentication middleware

import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyToken, type JWTPayload } from '../lib/jwt';

export const AUTH_COOKIE_NAME = 'auth_token';

import type { UserRole } from '../types';

export interface AuthUser {
	userId: string;
	email: string;
	role: UserRole;
}

// Extend Hono's context variables
declare module 'hono' {
	interface ContextVariableMap {
		user: AuthUser | null;
	}
}

type AuthBindings = {
	JWT_SECRET: string;
};

// Parse JWT from cookie and attach user to context (does not enforce auth)
export async function authMiddleware(
	c: Context<{ Bindings: AuthBindings }>,
	next: Next
): Promise<Response | void> {
	const token = getCookie(c, AUTH_COOKIE_NAME);

	if (token) {
		const payload = await verifyToken(token, c.env.JWT_SECRET);
		if (payload) {
			c.set('user', {
				userId: payload.userId,
				email: payload.email,
				role: payload.role,
			});
		} else {
			c.set('user', null);
		}
	} else {
		c.set('user', null);
	}

	await next();
}

// Require authentication - redirect to login if not authenticated
export async function requireAuth(
	c: Context<{ Bindings: AuthBindings }>,
	next: Next
): Promise<Response | void> {
	const user = c.get('user');

	if (!user) {
		// For API routes, return 401
		if (c.req.path.startsWith('/api/')) {
			return c.json({ error: 'Unauthorized' }, 401);
		}
		// For page routes, redirect to login
		return c.redirect('/auth/login');
	}

	await next();
}

// Require admin role - return 403 if not admin
export async function requireAdmin(
	c: Context<{ Bindings: AuthBindings }>,
	next: Next
): Promise<Response | void> {
	const user = c.get('user');

	if (!user) {
		if (c.req.path.startsWith('/api/')) {
			return c.json({ error: 'Unauthorized' }, 401);
		}
		return c.redirect('/auth/login');
	}

	if (user.role !== 'admin' && user.role !== 'editor') {
		if (c.req.path.startsWith('/api/')) {
			return c.json({ error: 'Forbidden' }, 403);
		}
		return c.text('Forbidden', 403);
	}

	await next();
}
