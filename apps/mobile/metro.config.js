// Monorepo setup: @steam/contracts and @steam/domain are consumed as TypeScript
// source, so Metro has to watch and transpile them from outside this folder.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

// Expo's default config, plus the serializer that stamps a matching debug id
// into every bundle and its source map. Uploading without it leaves the two
// unrelatable, and a stack unreadable (ADR-0017).
const config = getSentryExpoConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// Hierarchical lookup stays ON: pnpm keeps a package's own dependencies in a
// sibling node_modules rather than hoisting them, so Metro must be allowed to
// walk up to find them. Disabling it is npm/Yarn advice and breaks pnpm.

module.exports = config;
