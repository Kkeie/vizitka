const FALLBACK_PUBLIC_DOMAIN = "vizitka.ddns.net";
const rawDomain = import.meta.env.DOMAIN?.trim() || FALLBACK_PUBLIC_DOMAIN;
const domainWithoutProtocol = rawDomain.replace(/^https?:\/\//i, "").replace(/\/+$/, "");

export const PUBLIC_BASE_URL = domainWithoutProtocol;
export const PUBLIC_BASE_URL_WITH_SLASH = `${PUBLIC_BASE_URL}/`;

