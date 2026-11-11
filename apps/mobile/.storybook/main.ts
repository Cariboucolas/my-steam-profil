import type { StorybookConfig } from "@storybook/react-native-web-vite";
import { mergeConfig } from "vite";

import { resolveRevision } from "../src/api-client/config";

/**
 * Two modules import names that do not exist at run time: expo-modules-core's
 * `ts-declarations/global` imports four types as values (SDK 58), and
 * react-native-svg's sound module imports `TurboModuleRegistry`, which
 * react-native-web lacks. A build only warns; the dev server's optimiser
 * refuses to start. Neither does anything on the web — the first is types
 * alone, the second is required lazily, on Android — so both the dev server's
 * optimiser and the build are handed an empty module for each. The build needs
 * it too: converting mixed modules hoists the lazy `require` to a top-level
 * import, and the gallery dies on `getEnforcing` before drawing anything. An
 * alias cannot do it: both are reached by relative imports inside their
 * packages, which aliases never see.
 */
const WEB_DEAD_MODULES = /[\\/](ts-declarations[\\/]global|fabric[\\/]NativeSvgSoundModule)\.js$/;
const EMPTY_MODULE = "export default undefined;";

/** For the dev server's optimiser (esbuild). */
const emptyWebDeadModules = {
  name: "empty-web-dead-modules",
  setup(build: {
    onLoad: (options: { filter: RegExp }, load: () => { contents: string }) => void;
  }) {
    build.onLoad({ filter: WEB_DEAD_MODULES }, () => ({ contents: EMPTY_MODULE }));
  },
};

/** For the build (Rollup). */
const emptyWebDeadModulesInBuild = {
  name: "empty-web-dead-modules",
  enforce: "pre" as const,
  load: (id: string) => (WEB_DEAD_MODULES.test(id) ? EMPTY_MODULE : undefined),
};

const config: StorybookConfig = {
  // Each level's Index first: it says what the level holds before its stories show it.
  stories: ["../src/components/**/Index.mdx", "../src/components/**/*.stories.tsx"],
  // Reads the Index pages, and draws a docs page for every component tagged
  // `autodocs` in the preview.
  addons: ["@storybook/addon-docs"],
  framework: {
    name: "@storybook/react-native-web-vite",
    options: {},
  },
  core: { disableTelemetry: true },
  // The font packages export ES modules that `require` their .ttf files. The
  // dev server's optimiser converts those calls; a production build leaves
  // them as they are, and the browser meets a `require` it does not have — a
  // gallery that builds green and draws nothing. Converting mixed modules in
  // the build turns each `require` into an import of the font's URL.
  //
  // React Native 0.87 dropped `@react-native/assets-registry`, which
  // react-native-svg's web build still imports. Metro sends it to
  // react-native-web's registry (Expo CLI, until SDK 59); Vite is told the same.
  viteFinal: (config) =>
    mergeConfig(config, {
      plugins: [emptyWebDeadModulesInBuild],
      build: { commonjsOptions: { transformMixedEsModules: true } },
      optimizeDeps: { esbuildOptions: { plugins: [emptyWebDeadModules] } },
      resolve: {
        alias: [
          {
            find: /^@react-native\/assets-registry\/registry(\.js)?$/,
            replacement: "react-native-web/asset-registry",
          },
        ],
      },
    }),
  // The gallery states its Revision as the app does (ADR-0016), from the same
  // two build-time variables, so a screenshot of a story says which commit
  // drew it.
  env: (config) => ({
    ...config,
    STORYBOOK_REVISION: resolveRevision(
      process.env.EXPO_PUBLIC_COMMIT_SHA,
      process.env.EXPO_PUBLIC_LIVE,
    ),
  }),
};

export default config;
