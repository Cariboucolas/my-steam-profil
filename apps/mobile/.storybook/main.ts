import type { StorybookConfig } from "@storybook/react-native-web-vite";
import { mergeConfig } from "vite";

import { resolveRevision } from "../src/api-client/config";

const config: StorybookConfig = {
  stories: ["../src/components/**/*.stories.tsx"],
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
  viteFinal: (config) =>
    mergeConfig(config, {
      build: { commonjsOptions: { transformMixedEsModules: true } },
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
