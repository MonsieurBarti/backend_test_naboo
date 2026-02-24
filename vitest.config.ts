import swc from "unplugin-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const sharedPlugins = [swc.vite({ module: { type: "es6" } }), tsconfigPaths()];

export default defineConfig({
  plugins: sharedPlugins,
  test: {
    globals: true,
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.spec.ts",
        "src/**/*.integration.spec.ts",
        "src/**/*.e2e.spec.ts",
        "src/**/*.module.ts",
        "src/main.ts",
        "src/**/*.builder.ts",
        "src/**/*.tokens.ts",
      ],
    },
    projects: [
      {
        plugins: sharedPlugins,
        test: {
          name: "unit",
          include: ["src/**/*.spec.ts"],
          exclude: ["src/**/*.integration.spec.ts", "src/**/*.e2e.spec.ts"],
        },
      },
      {
        plugins: sharedPlugins,
        test: {
          name: "integration",
          include: ["src/**/*.integration.spec.ts"],
          hookTimeout: 60000,
          testTimeout: 30000,
        },
      },
      {
        plugins: sharedPlugins,
        test: {
          name: "e2e",
          include: ["src/**/*.e2e.spec.ts"],
        },
      },
    ],
  },
});
