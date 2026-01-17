import type { FC, PropsWithChildren } from 'hono/jsx';

type AdminLayoutProps = PropsWithChildren<{
	title?: string;
}>;

const SITE_NAME = 'Sint Lucas Masters';

export const AdminLayout: FC<AdminLayoutProps> = ({ title, children }) => {
	const pageTitle = title ? `${title} - ${SITE_NAME}` : SITE_NAME;

	return (
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>{pageTitle}</title>

				{/* Google Fonts - Space Grotesk */}
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
				<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

				{/* Styles */}
				<link rel="stylesheet" href="/styles.css" />
				<link rel="stylesheet" href="/admin.css" />
			</head>
			<body>
				<header class="site-header">
					<div class="header-inner">
						<a href="/" class="logo" aria-label="Sint Lucas Masters Home">
							<img src="/logo-white.svg" alt="Sint Lucas Antwerpen" />
						</a>
						<nav class="site-nav">
							<a href="/">Projects</a>
							<a href="/archive">Archive</a>
							<a href="/about">About</a>
						</nav>
					</div>
				</header>
				<main>{children}</main>
			</body>
		</html>
	);
};
