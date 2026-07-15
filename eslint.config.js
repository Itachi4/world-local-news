import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      ".claude/**",
      ".claude-flow/**",
      // Root-level utility/draft scripts — not part of the app build
      "comprehensive-news-scraper.ts",
      "improved-search-scraper.ts",
      "real-news-search-function.ts",
      "simple-search-function.ts",
      // Deno edge functions have their own runtime; skip strict TS checks here
      "supabase/functions/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // `any` is used pragmatically with Supabase generics; warn instead of error
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  },
  // Config files use CommonJS require — allow it there only
  {
    files: ["tailwind.config.ts", "vite.config.ts", "postcss.config.*"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      // Older name for the same rule — suppress if present in extended configs
      "@typescript-eslint/no-var-requires": "off",
    },
  },
);
