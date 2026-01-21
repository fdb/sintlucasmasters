import { useEffect, useState } from 'react';

type AuthUser = {
	id: string;
	email: string;
	name: string | null;
	isAdmin: boolean;
};

type AuthResponse =
	| { authenticated: true; user: AuthUser }
	| { authenticated: false };

export default function App() {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

	useEffect(() => {
		const load = async () => {
			try {
				const res = await fetch('/api/auth/me');
				if (!res.ok) {
					setStatus('error');
					return;
				}
				const data = (await res.json()) as AuthResponse;
				if (data.authenticated) {
					setUser(data.user);
				}
				setStatus('ready');
			} catch {
				setStatus('error');
			}
		};

		load();
	}, []);

	const handleLogout = async () => {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/auth/login';
	};

	return (
		<div className="auth-container">
			<h1>Admin</h1>
			<p>This is a stub admin page.</p>
			{status === 'loading' && <p>Loading your session…</p>}
			{status === 'error' && <p className="error-message">Unable to load your session.</p>}
			{user && (
				<p className="success-message">
					Signed in as <strong>{user.email}</strong>.
				</p>
			)}
			<p>Only users created via <code>npm run create-admin</code> can access this page.</p>
			<button type="button" onClick={handleLogout}>
				Log out
			</button>
		</div>
	);
}
