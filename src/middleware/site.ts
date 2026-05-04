// Site-resolution middleware.
//
// Reads the request Host header (or falls back to URL hostname) and resolves
// it to a SiteConfig via the SITES registry. In dev — i.e. when the host is
// NOT a registered production hostname — we additionally honor a
// `?__site=<id>` query parameter and an `X-Site-Override` header so a single
// localhost can simulate any of the three sites.
//
// All public handlers should read `c.var.site` rather than branching on
// hostname themselves.

import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { type SiteConfig, type SiteId, getSite, isProductionHost, resolveSite, SITES } from "../sites";

declare module "hono" {
  interface ContextVariableMap {
    site: SiteConfig;
  }
}

const SITE_ID_SET = new Set<SiteId>(SITES.map((s) => s.id));
const DEV_SITE_COOKIE = "slam_dev_site";

function asSiteId(value: string | undefined | null): SiteId | null {
  if (!value) return null;
  return SITE_ID_SET.has(value as SiteId) ? (value as SiteId) : null;
}

export async function siteMiddleware(c: Context, next: Next): Promise<void> {
  const host = c.req.header("host") ?? new URL(c.req.url).hostname;

  // On a real production host, lock the site to that host. Overrides are
  // dev-only — we never want a stray query param to swap chrome on a live
  // domain.
  if (isProductionHost(host)) {
    c.set("site", resolveSite(host));
    await next();
    return;
  }

  // Dev resolution order:
  //   1. ?__site=<id> in the URL — explicit, also persisted as a cookie.
  //   2. X-Site-Override header — for E2E test sessions.
  //   3. slam_dev_site cookie — sticky from a previous explicit override.
  //   4. Host fallback (resolveSite → DEFAULT_SITE_ID = graduates).
  const queryOverride = asSiteId(c.req.query("__site"));
  const headerOverride = asSiteId(c.req.header("x-site-override"));
  const cookieOverride = asSiteId(getCookie(c, DEV_SITE_COOKIE));

  if (queryOverride) {
    setCookie(c, DEV_SITE_COOKIE, queryOverride, {
      path: "/",
      sameSite: "Lax",
      maxAge: 60 * 60 * 24,
    });
    c.set("site", getSite(queryOverride));
    await next();
    return;
  }

  const stickyId = headerOverride ?? cookieOverride;
  if (stickyId) {
    c.set("site", getSite(stickyId));
    await next();
    return;
  }

  c.set("site", resolveSite(host));
  await next();
}
