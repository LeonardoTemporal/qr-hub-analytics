import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/app/api/schema.d.ts",
      ],
      thresholds: {
        statements: 8,
        branches: 4,
        functions: 5,
        lines: 8,
        "src/app/api/**": {
          statements: 65,
          branches: 70,
          functions: 75,
          lines: 65,
        },
        "src/features/admin/pages/AdminLoginPage.tsx": {
          statements: 85,
          branches: 55,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
});
