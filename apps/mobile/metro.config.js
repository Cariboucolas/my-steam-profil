// Monorepo setup: @steam/contracts and @steam/domain are consumed as TypeScript
// source, so Metro has to watch and transpile them from outside this folder.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("node:path");

// A bundle embedded by an EAS build states the commit it was built from
// (ADR-0020). Nothing the runner sets reaches the builder, but the builder
// knows the commit, and this runs before Metro forks the workers that inline
// EXPO_PUBLIC_*. Here rather than in eas.json or an app config, which are part
// of the fingerprint. It fills a gap and never overrides: an update, a web
// export or a developer's .env still says what it says.
if (!process.env.EXPO_PUBLIC_COMMIT_SHA && process.env.EAS_BUILD_GIT_COMMIT_HASH) {
  process.env.EXPO_PUBLIC_COMMIT_SHA = process.env.EAS_BUILD_GIT_COMMIT_HASH;
}

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
