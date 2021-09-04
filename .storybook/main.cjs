module.exports = {
  stories: ["../src/components/**/*.stories.tsx"],
  addons: ["@storybook/addon-links", "@storybook/addon-essentials"],
  core: {
    builder: "storybook-builder-vite",
  },
  async viteFinal(config) {
    console.log(config.esbuild);
    return {
      ...config,
      esbuild: {
        jsxInject: `import React from "react"`,
      },
    };
  },
};
