module.exports = {
  stories: [
    "../src/components/**/*.stories.tsx"
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
  ],
  babel: (options) => ({
    ...options,
    plugins: [...options.plugins, '@babel/plugin-transform-react-jsx'],
  }),
}
