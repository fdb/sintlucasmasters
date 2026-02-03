import type { FC, PropsWithChildren } from "hono/jsx";
import { CURRENT_YEAR } from "../config";

type LayoutProps = PropsWithChildren<{
  title?: string;
  ogImage?: string | null;
  ogDescription?: string;
  ogUrl?: string;
  canonicalUrl?: string;
  hideSubheader?: boolean;
  jsonLd?: object | object[];
}>;

const SITE_NAME = "Graduation Tour";
const DEFAULT_DESCRIPTION =
  "Presenting the graduation projects of the Masters in Art and Design at Sint Lucas Antwerpen.";
const SITE_URL = "https://sintlucasmasters.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

export const Layout: FC<LayoutProps> = ({
  title,
  ogImage,
  ogDescription,
  ogUrl,
  canonicalUrl,
  hideSubheader,
  jsonLd,
  children,
}) => {
  const pageTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  const description = ogDescription || DEFAULT_DESCRIPTION;
  const finalOgImage = ogImage || DEFAULT_OG_IMAGE;

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta name="view-transition" content="same-origin" />

        {/* Canonical URL */}
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

        {/* OpenGraph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content={ogImage ? "article" : "website"} />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        <meta property="og:image" content={finalOgImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={finalOgImage} />

        {/* JSON-LD Structured Data */}
        {jsonLd &&
          (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((data, i) => (
            <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
          ))}

        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Styles */}
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <div class="top-bar">
          <div class="top-bar-inner">
            <a
              href="https://www.sintlucasantwerpen.be/"
              class="top-bar-logo"
              aria-label="Sint Lucas Antwerpen Website"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/logo-white.svg" alt="Sint Lucas Antwerpen" />
            </a>
          </div>
        </div>
        <header class="site-header site-header--public">
          <div class="header-inner">
            <a href={`/${CURRENT_YEAR}/`} class="site-title-link">
              <h1 class="site-title">Graduation Tour</h1>
              <p class="site-tagline">
                Presenting the graduation projects of the 2025–2026 Masters in Art and Design at Sint Lucas Antwerpen.
              </p>
            </a>
          </div>
        </header>
        {!hideSubheader && (
          <nav class="sub-header">
            <div class="sub-header-inner">
              <div class="sub-header-left">
                <a href={`/${CURRENT_YEAR}/`}>projects</a>
                <a href="/about">about</a>
              </div>
              <div class="sub-header-right">
                <a href="/archive">archive</a>
              </div>
            </div>
          </nav>
        )}
        <main>{children}</main>
        <footer class="site-footer">
          <div class="footer-inner">
            <div class="footer-top">
              <div class="footer-col footer-col--programme">
                <h3 class="footer-heading">Our Master's programme</h3>
                <p class="footer-sub">The start of your professional career.</p>
                <a
                  href="https://www.sintlucasantwerpen.be/opleidingen/master-of-visual-arts/"
                  class="footer-arrow-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Explore the Master of Visual Arts
                </a>
                <p class="footer-note">
                  Sint Lucas Antwerpen, School of Arts, is part of KdG University of Applied Sciences and Arts.
                </p>
                <a
                  href="https://www.kdg.be/en/programmes/apply-english-taught-master-programme"
                  class="footer-arrow-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Apply now — admission requirements, tuition fees &amp; application
                </a>
              </div>
              <div class="footer-col footer-col--contact">
                <p class="footer-contact-name">Sint Lucas Antwerpen</p>
                <p>Van Schoonbekestraat 143, 2018 Antwerp, Belgium</p>
                <p>
                  +32 (0)3 613 12 00 · <a href="mailto:info.sla@kdg.be">info.sla@kdg.be</a>
                </p>
                <p>
                  <a href="https://www.sintlucasantwerpen.be" target="_blank" rel="noopener noreferrer">
                    sintlucasantwerpen.be
                  </a>
                  {" · "}
                  <a href="https://www.instagram.com/sintlucasantwerpen" target="_blank" rel="noopener noreferrer">
                    @sintlucasantwerpen
                  </a>
                </p>
              </div>
            </div>
            <div class="footer-bottom">
              <p>
                © Sint Lucas Antwerpen ·{" "}
                <a href="https://www.kdg.be/en/terms-use-privacy" target="_blank" rel="noopener noreferrer">
                  Terms of Use &amp; Privacy
                </a>
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
};
