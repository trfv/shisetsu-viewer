module.exports = {
  stories: ["../src/components/**/*.stories.tsx"],
  addons: ["@storybook/addon-essentials"],
  core: {
    builder: "@storybook/builder-vite",
  },
  staticDirs: ["../public"],
  async viteFinal(config) {
    return {
      ...config,
    };
  },
};
