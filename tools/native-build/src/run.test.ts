import { describe, it, expect, vi } from "vitest";

import type { Build } from "./builds";
import { ensureBuild, type Ports } from "./run";

const RUNTIME = "974c29378fccfcaacb768dd5973404a0b9238f52";
const SHA = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";
const APK = "https://expo.dev/artifacts/eas/new.apk";

const build = (status: Build["status"], overrides: Partial<Build> = {}): Build => ({
  id: "b-1",
  status,
  runtimeVersion: RUNTIME,
  installUrl: status === "FINISHED" ? APK : undefined,
  ...overrides,
});

const portsWith = (existing: readonly Build[], built: readonly Build[] = [build("FINISHED")]) => {
  const ports = {
    fingerprint: vi.fn(async () => RUNTIME),
    listBuilds: vi.fn(async (_runtime: string) => existing),
    startBuild: vi.fn(async () => built),
    announce: vi.fn(async (_line: string) => {}),
  } satisfies Ports;
  return ports;
};

describe("a merge whose fingerprint is already built", () => {
  it("asks EAS about the fingerprint computed for this commit", async () => {
    const ports = portsWith([build("FINISHED")]);
    await ensureBuild(ports, SHA);
    expect(ports.listBuilds).toHaveBeenCalledWith(RUNTIME);
  });

  it("starts no build and posts nothing", async () => {
    const ports = portsWith([build("FINISHED")]);

    expect(await ensureBuild(ports, SHA)).toEqual({ kind: "covered", build: build("FINISHED") });
    expect(ports.startBuild).not.toHaveBeenCalled();
    expect(ports.announce).not.toHaveBeenCalled();
  });

  it("counts a build still in the queue, so two quick merges cost one build", async () => {
    const ports = portsWith([build("IN_QUEUE")]);

    expect(await ensureBuild(ports, SHA)).toMatchObject({ kind: "covered" });
    expect(ports.startBuild).not.toHaveBeenCalled();
  });
});

describe("a merge whose fingerprint has no build", () => {
  it("starts exactly one build and posts its install link once", async () => {
    const ports = portsWith([build("ERRORED")]);

    expect(await ensureBuild(ports, SHA)).toEqual({ kind: "built", installUrl: APK });
    expect(ports.startBuild).toHaveBeenCalledTimes(1);
    expect(ports.announce).toHaveBeenCalledTimes(1);
    expect(ports.announce).toHaveBeenCalledWith(
      `📦 Android build for \`a1b2c3d\` is ready — the native fingerprint changed, so the installed app stops receiving updates until this one replaces it: ${APK}`,
    );
  });

  it("fails, and posts nothing, when the build errors at Expo", async () => {
    const ports = portsWith([], [build("ERRORED")]);

    await expect(ensureBuild(ports, SHA)).rejects.toThrow("The build ended ERRORED at Expo.");
    expect(ports.announce).not.toHaveBeenCalled();
  });

  it("fails when the channel refuses the post, rather than losing the link quietly", async () => {
    const ports = portsWith([]);
    ports.announce.mockRejectedValueOnce(new Error("Discord refused the post: HTTP 404"));

    await expect(ensureBuild(ports, SHA)).rejects.toThrow("HTTP 404");
  });
});
