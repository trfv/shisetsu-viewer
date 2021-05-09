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
    plugins: [...options.plugins, ["@babel/plugin-proposal-private-property-in-object", { "loose": true }]],
  }),
}
