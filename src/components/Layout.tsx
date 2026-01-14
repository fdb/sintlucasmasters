import type { FC, PropsWithChildren } from 'hono/jsx';

type LayoutProps = PropsWithChildren<{
	title?: string;
	ogImage?: string;
	ogDescription?: string;
	ogUrl?: string;
}>;

const SITE_NAME = 'Sint Lucas Masters';
const DEFAULT_DESCRIPTION = 'Master graduation projects from Sint Lucas Antwerpen';

export const Layout: FC<LayoutProps> = ({ title, ogImage, ogDescription, ogUrl, children }) => {
	const pageTitle = title ? `${title} - ${SITE_NAME}` : SITE_NAME;
	const description = ogDescription || DEFAULT_DESCRIPTION;

	return (
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>{pageTitle}</title>
				<meta name="description" content={description} />

				{/* OpenGraph */}
				<meta property="og:title" content={pageTitle} />
				<meta property="og:description" content={description} />
				<meta property="og:site_name" content={SITE_NAME} />
				<meta property="og:type" content={ogImage ? 'article' : 'website'} />
				{ogUrl && <meta property="og:url" content={ogUrl} />}
				{ogImage && <meta property="og:image" content={ogImage} />}
				{ogImage && <meta property="og:image:width" content="1200" />}
				{ogImage && <meta property="og:image:height" content="630" />}

				{/* Twitter Card */}
				<meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
				<meta name="twitter:title" content={pageTitle} />
				<meta name="twitter:description" content={description} />
				{ogImage && <meta name="twitter:image" content={ogImage} />}

				{/* Google Fonts - Space Grotesk */}
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
				<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

				{/* Styles */}
				<link rel="stylesheet" href="/styles.css" />
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
						</nav>
					</div>
				</header>
				<main>{children}</main>
				<footer class="site-footer">
					<div class="footer-inner">
						<a href="/" class="footer-logo" aria-label="Sint Lucas Masters Home">
							<img src="/logo-white.svg" alt="Sint Lucas Antwerpen" />
						</a>
						<p class="footer-text">
							Interested in the Master? More info at <a href="https://www.sintlucasantwerpen.be" class="footer-link" target="_blank" rel="noopener noreferrer">sintlucasantwerpen.be</a>.
						</p>
					</div>
				</footer>
			</body>
		</html>
	);
};
