import type { StorybookConfig } from "@storybook/types";

const config: StorybookConfig = {
  stories: ["../src"],
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
