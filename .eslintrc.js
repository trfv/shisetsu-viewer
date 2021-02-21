module.exports = {
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  extends: ["prettier"],
  plugins: ["prettier"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
  },
  rules: {
    semi: ["error", "always"],
    "prettier/prettier": [
      "error",
      {
        printWidth: 100,
        tabWidth: 2,
        singleQuote: false,
        trailingComma: "es5",
      },
    ],
    "@typescript-eslint/camelcase": "off",
    "no-restricted-imports": [
      "error",
      {
        patterns: ["@material-ui/*/*/*", "!@material-ui/core/test-utils/*"],
      },
    ],
  },
};
