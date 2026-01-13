import type { FC, PropsWithChildren } from 'hono/jsx';

type LayoutProps = PropsWithChildren<{
	title?: string;
}>;

export const Layout: FC<LayoutProps> = ({ title, children }) => {
	const pageTitle = title ? `${title} - Sint Lucas Masters` : 'Sint Lucas Masters';

	return (
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>{pageTitle}</title>
				<style>{`
					:root {
						font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
						line-height: 1.5;
					}
					* {
						box-sizing: border-box;
					}
					body {
						max-width: 1200px;
						margin: 0 auto;
						padding: 1rem;
						background: white;
					}
					img {
						max-width: 100%;
						height: auto;
					}
					a {
						color: inherit;
					}
					header {
						margin-bottom: 2rem;
						padding-bottom: 1rem;
						border-bottom: 1px solid #eee;
					}
					header h1 {
						margin: 0;
						font-size: 1.5rem;
					}
					header nav {
						margin-top: 0.5rem;
					}
					header nav a {
						margin-right: 1rem;
					}
					.grid {
						display: grid;
						grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
						gap: 1.5rem;
					}
					.card {
						border: 1px solid #eee;
						padding: 1rem;
					}
					.card img {
						width: 100%;
						aspect-ratio: 4/3;
						object-fit: cover;
						margin-bottom: 0.5rem;
					}
					.card h2 {
						font-size: 1rem;
						margin: 0 0 0.25rem 0;
					}
					.card p {
						margin: 0;
						color: #666;
						font-size: 0.875rem;
					}
					.filters {
						margin-bottom: 1.5rem;
					}
					.filters a {
						display: inline-block;
						padding: 0.25rem 0.75rem;
						margin-right: 0.5rem;
						margin-bottom: 0.5rem;
						border: 1px solid #ccc;
						text-decoration: none;
						font-size: 0.875rem;
					}
					.filters a.active {
						background: #000;
						color: #fff;
						border-color: #000;
					}
					.project-detail {
						max-width: 800px;
					}
					.project-detail h1 {
						margin-bottom: 0.25rem;
					}
					.project-detail .meta {
						color: #666;
						margin-bottom: 1.5rem;
					}
					.project-detail .main-image {
						width: 100%;
						margin-bottom: 1.5rem;
					}
					.project-detail .description {
						white-space: pre-wrap;
						margin-bottom: 2rem;
					}
					.project-detail .gallery {
						display: grid;
						grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
						gap: 1rem;
						margin-bottom: 2rem;
					}
					.project-detail .gallery img {
						width: 100%;
						aspect-ratio: 1;
						object-fit: cover;
					}
					.project-detail .links a {
						display: inline-block;
						margin-right: 1rem;
					}
					.back-link {
						display: inline-block;
						margin-bottom: 1rem;
					}
				`}</style>
			</head>
			<body>
				<header>
					<h1>Sint Lucas Masters</h1>
					<nav>
						<a href="/">Current Year</a>
						<a href="/archive">Archive</a>
					</nav>
				</header>
				<main>{children}</main>
			</body>
		</html>
	);
};
