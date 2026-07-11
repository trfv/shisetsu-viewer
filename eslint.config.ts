import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config([
  {
    ignores: ["**/*.json", "build/**", "coverage/**", "node_modules/**", "public/**"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.mjs"],
    languageOptions: {
      sourceType: "module",
      ecmaVersion: "latest",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.tsx"],
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
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
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      "react/display-name": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      // 匿名の default export アロー（`export default () => {}`）は
      // rules-of-hooks が発火しない（コンポーネント名を認識できない）ため禁止する。
      // 名前付き const にして `export default Name;` とする。
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration > ArrowFunctionExpression",
          message:
            "匿名の default export アローは禁止。名前付き const にして `export default Name;` としてください（rules-of-hooks 発火のため）。",
        },
      ],
    },
  },
]);
