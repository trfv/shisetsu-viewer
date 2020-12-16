module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: ["plugin:prettier/recommended", "prettier/@typescript-eslint", "prettier/react"],
  plugins: ["react", "@typescript-eslint"],
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018,
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
  settings: {
    react: {
      version: "detect",
    },
  },
};
