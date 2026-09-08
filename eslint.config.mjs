import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    files: ["src/modules/**/*.{js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**", "@/domains/**"],
              message:
                "Core modules cannot depend on app composition or project domains.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/modules/background/provider.js",
      "src/modules/context-menu/index.js",
      "src/modules/controls/index.js",
      "src/modules/loading/provider.js",
      "src/modules/modal/index.js",
      "src/modules/nav/{behavior,index,layout,provider,surface}.js",
      "src/modules/notification/{index,provider}.js",
      "src/ui/feedback/fullscreen-state.js",
    ],
    rules: {
      // These effects synchronize portal, registry, viewport, and navigation
      // lifecycle boundaries. Keep the exception limited to their current files.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: [
      "src/modules/nav/layout.js",
      "src/modules/nav/provider.js",
      "src/modules/nav/surface.js",
      "src/modules/registry/{hooks,provider}.js",
    ],
    rules: {
      // These files implement external stores and measured state through refs.
      "react-hooks/refs": "off",
    },
  },
  {
    files: ["src/modules/nav/{status,surface}.js"],
    rules: {
      // The callbacks intentionally observe mutable lifecycle snapshots.
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    files: ["src/modules/nav/surface.js"],
    rules: {
      // Performance timestamps are captured while constructing transition state.
      "react-hooks/purity": "off",
    },
  },
  {
    files: ["src/modules/modal/index.js"],
    rules: {
      // Modal component types are resolved dynamically from the registry.
      "react-hooks/static-components": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".open-next/**",
    ".wrangler/**",
    "cloudflare-env.d.ts",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
