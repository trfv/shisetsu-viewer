import { dirname, join } from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";

function getAbsolutePath(value: string) {
  return dirname(require.resolve(join(value, "package.json")));
}

const config: StorybookConfig = {
  stories: ["../**/*.stories.tsx"],
  addons: [getAbsolutePath("@storybook/addon-docs")],
  staticDirs: ["../public"],
  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {},
  },
};

export default config;
