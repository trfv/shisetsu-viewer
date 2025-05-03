import type { StorybookConfig } from "@storybook/core/types";

const config: StorybookConfig = {
  stories: ["../**/*.stories.tsx"],
  addons: ["@storybook/addon-essentials"],
  staticDirs: ["../public"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: true,
  },
};

module.exports = config;
