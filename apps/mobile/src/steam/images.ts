/**
 * Steam serves game art from a public CDN, addressed by appId. The backend
 * already builds icon URLs for the library list; cover art is only ever needed
 * for display, so it is built here.
 */
const CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps";

/** Wide store header art, used behind a game's title. */
export const gameCoverUrl = (appId: number): string =>
  `${CDN}/${appId}/header.jpg`;
