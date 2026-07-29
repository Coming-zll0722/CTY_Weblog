const DEVELOPMENT_SITE_ORIGIN = "http://localhost:3000";

export function getSiteOrigin(fallback = DEVELOPMENT_SITE_ORIGIN): string {
  const configured = process.env.SITE_URL?.trim() || fallback;
  const url = new URL(configured);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("SITE_URL must be an absolute HTTP(S) origin without credentials.");
  }
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.origin;
}

export function absoluteSiteUrl(path: string, fallback?: string): string {
  return new URL(path, `${getSiteOrigin(fallback)}/`).toString();
}
