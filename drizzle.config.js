import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "turso",
  schema: "./db/schema/index.js",
  out: "./db/migrations",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || "file:local.db",
    ...(process.env.TURSO_AUTH_TOKEN
      ? { authToken: process.env.TURSO_AUTH_TOKEN }
      : {}),
  },
});