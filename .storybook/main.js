module.exports = {
  stories: ["../src/components/**/*.stories.tsx"],
  addons: ["@storybook/addon-essentials"],
  staticDirs: ["../public"],
  async viteFinal(config) {
    return {
      ...config
    };
  },
  framework: {
    name: "@storybook/react-vite",
    options: {}
  },
  docs: {
    autodocs: true
  }
};