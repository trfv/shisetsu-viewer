import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import storybook from "eslint-plugin-storybook";
import typescript from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-redeclare": "off",
    },
  },
  {
    ignores: [
      "**/*.json",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "public/**",
      "storybook-static/**",
      "packages/viewer/api/graphql-client.tsx",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": typescript,
    },
    languageOptions: {
      parser: tsParser,
      sourceType: "module",
    },
    rules: {
      ...typescript.configs.recommended.rules,
    },
  },
  {
    files: ["**/*.tsx"],
    plugins: {
      react: react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      sourceType: "module",
      ecmaVersion: "latest",
      globals: {
        React: "readonly",
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/display-name": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["**/*.stories.tsx"],
    plugins: {
      storybook: storybook,
    },
    rules: {
      ...storybook.configs.recommended.rules,
    },
  },
];
