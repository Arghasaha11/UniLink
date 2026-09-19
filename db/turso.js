import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const isLocalFile = url.startsWith("file:");

export const turso = createClient({
  url,
  ...(authToken ? { authToken } : {}),
  // A single connection lets us set connection-scoped PRAGMAs reliably,
  // e.g. enabling foreign key enforcement (off by default in SQLite).
  ...(isLocalFile ? { concurrency: 1 } : {}),
});

if (isLocalFile) {
  // SQLite disables foreign key enforcement by default. With concurrency: 1
  // the pragma stays active for every query on the shared connection.
  turso.execute("PRAGMA foreign_keys = ON");
}