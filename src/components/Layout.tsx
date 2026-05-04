import type { FC, PropsWithChildren } from "hono/jsx";
import type { SiteConfig } from "../sites";
import { MastersHeader, MastersFooter } from "./sites/MastersTemplate";
import { FotografieHeader, FotografieFooter } from "./sites/FotografieTemplate";
import { GraduatesHeader, GraduatesFooter } from "./sites/GraduatesTemplate";
import { TopBar } from "./sites/_shared";

type PublicLocale = "nl" | "en";

type LayoutProps = PropsWithChildren<{
  site: SiteConfig;
  title?: string;
  locale: PublicLocale;
  currentPath: string;
  ogImage?: string | null;
  ogDescription?: string;
  ogUrl?: string;
  ogType?: "website" | "article";
  canonicalUrl?: string;
  hideSubheader?: boolean;
  jsonLd?: object | object[];
}>;

function localeToHtmlLang(locale: PublicLocale): "en-BE" | "nl-BE" {
  return locale === "nl" ? "nl-BE" : "en-BE";
}

function toLocalePath(currentPath: string, targetLocale: PublicLocale): string {
  const [pathname, query] = currentPath.split("?");
  const withoutLocale = pathname.replace(/^\/(en|nl)(?=\/|$)/, "") || "/";
  const targetPath = `/${targetLocale}${withoutLocale === "/" ? "" : withoutLocale}`;
  return query ? `${targetPath}?${query}` : targetPath;
}

function defaultDescription(siteId: SiteConfig["id"], locale: PublicLocale): string {
  if (siteId === "fotografie") {
    return locale === "nl"
      ? "Ontdek het afstudeerwerk fotografie van de bachelorstudenten van Sint Lucas Antwerpen."
      : "Discover the photography graduation work from the bachelor students at Sint Lucas Antwerpen.";
  }
  if (siteId === "graduates") {
    return locale === "nl"
      ? "Ontdek het afstudeerwerk van de studenten van Sint Lucas Antwerpen."
      : "Discover the graduation work from the students at Sint Lucas Antwerpen.";
  }
  return locale === "nl"
    ? "Ontdek de afstudeerprojecten van de masters in kunst en design van Sint Lucas Antwerpen."
    : "Presenting the graduation projects of the Masters in Art and Design at Sint Lucas Antwerpen.";
}

const SiteHeader: FC<{ site: SiteConfig; locale: PublicLocale; currentPath: string; hideSubheader?: boolean }> = ({
  site,
  locale,
  currentPath,
  hideSubheader,
}) => {
  switch (site.id) {
    case "masters":
      return <MastersHeader locale={locale} hideSubheader={hideSubheader} />;
    case "fotografie":
      return <FotografieHeader locale={locale} hideSubheader={hideSubheader} />;
    case "graduates":
      return <GraduatesHeader locale={locale} currentPath={currentPath} site={site} hideSubheader={hideSubheader} />;
  }
};

const SiteFooter: FC<{ site: SiteConfig; locale: PublicLocale }> = ({ site, locale }) => {
  switch (site.id) {
    case "masters":
      return <MastersFooter locale={locale} />;
    case "fotografie":
      return <FotografieFooter locale={locale} />;
    case "graduates":
      return <GraduatesFooter locale={locale} />;
  }
};

export const Layout: FC<LayoutProps> = ({
  site,
  title,
  locale,
  currentPath,
  ogImage,
  ogDescription,
  ogType,
  canonicalUrl,
  hideSubheader,
  jsonLd,
  children,
}) => {
  const siteUrl = `https://${site.hostname}`;
  const defaultOgImage = site.ogImage ? `${siteUrl}${site.ogImage}` : `${siteUrl}/og-default.jpg`;
  const pageTitle = title ? `${title} - ${site.siteName}` : site.siteName;
  const description = ogDescription || defaultDescription(site.id, locale);
  const finalOgImage = ogImage || defaultOgImage;
  const finalOgType = ogType ?? (ogImage ? "article" : "website");
  const nlPath = toLocalePath(currentPath, "nl");
  const enPath = toLocalePath(currentPath, "en");

  return (
    <html lang={localeToHtmlLang(locale)}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta name="view-transition" content="same-origin" />

        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:site_name" content={site.siteName} />
        <meta property="og:type" content={finalOgType} />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        <meta property="og:image" content={finalOgImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={finalOgImage} />

        {jsonLd &&
          (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((data, i) => (
            <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
          ))}

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        <link rel="stylesheet" href="/styles.css" />
        <script src="/search.js" defer />
      </head>
      <body data-site={site.id}>
        <TopBar locale={locale} nlPath={nlPath} enPath={enPath} logo={site.logo} />
        <SiteHeader site={site} locale={locale} currentPath={currentPath} hideSubheader={hideSubheader} />
        <main>{children}</main>
        <SiteFooter site={site} locale={locale} />
      </body>
    </html>
  );
};
