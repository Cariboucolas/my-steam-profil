import { serve } from "@hono/node-server";

import { createApp } from "./http/app";
import { loadConfig } from "./http/config";
import { createSteamClient } from "./steam/steam-client";

/** What an operator should read when the process refuses to start. */
const EXPLANATIONS: Readonly<Record<string, string>> = {
  MISSING_API_KEY:
    "STEAM_API_KEY is not set. Copy .env.example and fill it in, or export the key.",
  INVALID_PORT: "PORT must be a whole number between 1 and 65535.",
};

const config = loadConfig(process.env);
if (!config.ok) {
  console.error(EXPLANATIONS[config.error] ?? config.error);
  process.exit(1);
}

const app = createApp(createSteamClient({ apiKey: config.value.steamApiKey }));

const server = serve({ fetch: app.fetch, port: config.value.port }, ({ port }) => {
  console.log(`API listening on http://localhost:${port}`);
});

/**
 * A port already taken is an ordinary thing to hit while developing - usually
 * an earlier run of this same server. It deserves the same one-line answer as a
 * missing key, not a stack trace.
 */
server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${config.value.port} is already in use. Stop what is listening there, or set PORT to something else.`,
    );
    process.exit(1);
  }
  throw error;
});
