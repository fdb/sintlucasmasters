const instagramHandlePattern = /^@([A-Za-z0-9._]+)$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const instagramHosts = new Set(["instagram.com", "www.instagram.com", "instagr.am", "www.instagr.am"]);

const isLikelyUrl = (value: string) => {
  if (value.includes(" ")) return false;
  if (emailPattern.test(value)) return false;
  if (value.startsWith("www.")) return true;
  return value.includes(".");
};

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    if (value.startsWith("//")) {
      try {
        return new URL(`https:${value}`);
      } catch {
        return null;
      }
    }
    if (isLikelyUrl(value)) {
      try {
        return new URL(`https://${value}`);
      } catch {
        return null;
      }
    }
    return null;
  }
};

const normalizeInstagramUrl = (url: URL): string => {
  const path = url.pathname.startsWith("/") ? url.pathname : `/${url.pathname}`;
  const search = url.search ?? "";
  const hash = url.hash ?? "";
  return `https://www.instagram.com${path}${search}${hash}`;
};

const normalizeYoutubeShortUrl = (url: URL): string => {
  const pathSegments = url.pathname.split("/").filter(Boolean);
  const videoId = pathSegments[0];
  if (!videoId) return url.toString();

  const params = new URLSearchParams();
  params.set("v", videoId);

  const originalParams = url.searchParams;
  const time = originalParams.get("t");
  if (time) params.set("t", time);
  const list = originalParams.get("list");
  if (list) params.set("list", list);

  const query = params.toString();
  return `https://www.youtube.com/watch${query ? `?${query}` : ""}`;
};

export const normalizeSocialLink = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const handleMatch = trimmed.match(instagramHandlePattern);
  if (handleMatch) {
    return `https://www.instagram.com/${handleMatch[1]}`;
  }

  const parsed = parseUrl(trimmed);
  if (!parsed) return trimmed;

  const host = parsed.hostname.toLowerCase();

  if (instagramHosts.has(host)) {
    return normalizeInstagramUrl(parsed);
  }

  if (host === "youtu.be") {
    return normalizeYoutubeShortUrl(parsed);
  }

  return parsed.toString();
};

export const normalizeSocialLinksValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;

  let links: string[] = [];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        links = parsed.filter((item): item is string => typeof item === "string");
      } else if (typeof parsed === "string") {
        links = [parsed];
      }
    } catch {
      links = value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  } else if (Array.isArray(value)) {
    links = value.filter((item): item is string => typeof item === "string");
  }

  const normalized = links.map(normalizeSocialLink).filter((link) => link.length > 0);
  return normalized.length > 0 ? JSON.stringify(normalized) : null;
};
