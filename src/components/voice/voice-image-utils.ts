export function textbookImageSrc(relativeUrl: string, accessToken?: string | null): string {
  if (!relativeUrl) return "";
  let u = relativeUrl;
  if (accessToken) {
    u += `${u.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(accessToken)}`;
  }
  return u;
}

export function userImageSrc(url: string): string {
  return url;
}
