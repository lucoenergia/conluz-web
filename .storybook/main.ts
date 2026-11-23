import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  // Stories sit next to their component; nothing imports them, so the app
  // build never sees them.
  stories: ["../src/**/*.stories.tsx"],
  // The self-hosted Inter files preview-head.html points at.
  staticDirs: ["../public"],
  core: { disableTelemetry: true },
};

export default config;
