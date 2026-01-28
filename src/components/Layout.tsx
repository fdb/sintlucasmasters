import type { FC, PropsWithChildren } from "hono/jsx";
import { CURRENT_YEAR } from "../config";

type LayoutProps = PropsWithChildren<{
  title?: string;
  ogImage?: string | null;
  ogDescription?: string;
  ogUrl?: string;
  hideSubheader?: boolean;
}>;

const SITE_NAME = "Graduation Tour";
const DEFAULT_DESCRIPTION =
  "Presenting the graduation projects of the Masters in Art and Design at Sint Lucas Antwerpen.";

export const Layout: FC<LayoutProps> = ({ title, ogImage, ogDescription, ogUrl, hideSubheader, children }) => {
  const pageTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  const description = ogDescription || DEFAULT_DESCRIPTION;

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta name="view-transition" content="same-origin" />

        {/* OpenGraph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content={ogImage ? "article" : "website"} />
        {ogUrl && <meta property="og:url" content={ogUrl} />}
        {ogImage && <meta property="og:image" content={ogImage} />}
        {ogImage && <meta property="og:image:width" content="1200" />}
        {ogImage && <meta property="og:image:height" content="630" />}

        {/* Twitter Card */}
        <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={description} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}

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
        <header class="site-header">
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
              <p>© Sint Lucas Antwerpen · Terms of Use · Privacy</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
};
