import eslintReact from "@eslint-react/eslint-plugin";
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["**/*.json", "build/**", "coverage/**", "node_modules/**", "public/**"]),
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
    extends: [eslintReact.configs["recommended-typescript"]],
    languageOptions: {
      sourceType: "module",
      ecmaVersion: "latest",
      globals: {
        React: "readonly",
      },
    },
    rules: {
      // recommended-typescript は exhaustive-deps を "warn" にするが、
      // この repo では従来どおり "error" に引き上げる（lint:all は --max-warnings=0）。
      "@eslint-react/exhaustive-deps": "error",
      // eslint-react への移行で新たに検出された advisory ルール群。
      // 既存違反は eslint-suppressions.json に退避（bulk suppression）し、
      // 新規違反のみ error で検出する。段階的に潰したら --prune-suppressions で除去する。
      "@eslint-react/jsx-no-children-prop": "error",
      "@eslint-react/no-array-index-key": "error",
      "@eslint-react/no-children-map": "error",
      "@eslint-react/no-clone-element": "error",
      "@eslint-react/no-context-provider": "error",
      "@eslint-react/no-forward-ref": "error",
      "@eslint-react/no-use-context": "error",
      "@eslint-react/naming-convention-ref-name": "error",
      "@eslint-react/purity": "error",
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
