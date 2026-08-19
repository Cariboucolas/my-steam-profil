// Monorepo setup: @steam/contracts and @steam/domain are consumed as TypeScript
// source, so Metro has to watch and transpile them from outside this folder.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// Hierarchical lookup stays ON: pnpm keeps a package's own dependencies in a
// sibling node_modules rather than hoisting them, so Metro must be allowed to
// walk up to find them. Disabling it is npm/Yarn advice and breaks pnpm.

module.exports = config;
