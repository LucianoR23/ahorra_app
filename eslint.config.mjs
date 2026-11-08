import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Discreet mode (plan 1.9) hides amounts in <Money> and useFormatAmount.
    // Formatting an amount anywhere else would leak it.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/money.tsx", "src/stores/discreet.ts", "src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/format",
              importNames: ["formatAmount"],
              message: "Show amounts with <Money> or useFormatAmount() so discreet mode can hide them.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    "coverage/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/sw*.js",
    "public/sw*.js.map",
    "public/workbox-*.js",
    "public/workbox-*.js.map",
  ]),
]);
