import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config.mjs";

// End-to-end API tests that boot a real Next.js dev server against a live
// (or otherwise configured) database. Kept separate from the unit suite so
// `npm test` stays fast and does not need a server.
export default defineConfig({
  test: {
    ...baseConfig.test,
    include: ["tests/api/**/*.test.js"],
    exclude: [],
    globalSetup: ["tests/api/global-setup.js"],
    hookTimeout: 120000,
    testTimeout: 15000,
    sequence: {
      shuffle: false,
      concurrent: false,
    },
  },
  resolve: baseConfig.resolve,
});