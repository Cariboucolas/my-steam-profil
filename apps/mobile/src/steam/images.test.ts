import { gameCoverUrl } from "./images";

describe("gameCoverUrl", () => {
  it("points at the store header art for an app", () => {
    expect(gameCoverUrl(2066020)).toBe(
      "https://cdn.cloudflare.steamstatic.com/steam/apps/2066020/header.jpg",
    );
  });
});
