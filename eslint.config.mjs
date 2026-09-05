import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import next from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "dist/**",
    "out/**",
    "build/**",
    "outputs/**",
    "work/**",
    "next-env.d.ts",
  ]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat["recommended-latest"],
  jsxA11y.flatConfigs.recommended,
  next.configs["core-web-vitals"],
  {
    // The React Compiler rules that eslint-plugin-react-hooks v7 enables run the
    // compiler's own analysis over each component. On ModelBuilderApp, which is
    // still around 5,000 lines with roughly 195 callbacks in one scope, that
    // analysis exhausts the V8 heap and no rule runs on the file at all.
    // Scoping them off here is what lets every other rule lint this file today.
    // Remove this block once the shell is decomposed into hooks: every other
    // module, including the 7,400-line viewport, passes with these rules on.
    files: ["app/model-builder-app.tsx"],
    rules: Object.fromEntries([
      "static-components", "use-memo", "void-use-memo", "preserve-manual-memoization",
      "incompatible-library", "immutability", "globals", "refs", "set-state-in-effect",
      "error-boundaries", "purity", "set-state-in-render", "unsupported-syntax",
      "config", "gating",
    ].map((rule) => [`react-hooks/${rule}`, "off"])),
  },
  {
    // Cloudflare bindings are declared by merging into the global `Cloudflare`
    // namespace, which is the pattern `wrangler types` itself generates. The
    // exception lives in config rather than as an inline disable so application
    // source stays free of rule suppressions.
    files: ["db/**/*.ts", "worker/**/*.ts"],
    rules: {
      "@typescript-eslint/no-namespace": "off",
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
]);

export default eslintConfig;
