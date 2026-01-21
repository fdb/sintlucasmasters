import { Hono } from 'hono';
import type { Bindings } from '../types';
import { AdminLayout } from '../components/AdminLayout';
import { authMiddleware, requireAdmin } from '../middleware/auth';

export const adminPageRoutes = new Hono<{ Bindings: Bindings }>();

adminPageRoutes.use('*', authMiddleware, requireAdmin);

adminPageRoutes.get('/', (c) => {
	const user = c.get('user');

	return c.html(
		<AdminLayout title="Admin">
			<div class="auth-container">
				<h1>Admin</h1>
				<p>This is a stub admin page.</p>
				{user && (
					<p class="success-message">
						Signed in as <strong>{user.email}</strong>.
					</p>
				)}
				<p>Only users created via <code>npm run create-admin</code> can access this page.</p>
			</div>
		</AdminLayout>
	);
});
