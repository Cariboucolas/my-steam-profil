import type { StorybookConfig } from "@storybook/react-native-web-vite";

import { resolveRevision } from "../src/api-client/config";

const config: StorybookConfig = {
  stories: ["../src/components/**/*.stories.tsx"],
  framework: {
    name: "@storybook/react-native-web-vite",
    options: {},
  },
  core: { disableTelemetry: true },
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
