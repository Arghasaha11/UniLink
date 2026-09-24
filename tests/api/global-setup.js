import { spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { generateRunId } from "./helpers";

const root = fileURLToPath(new URL("../../", import.meta.url));
const tmpDir = path.join(root, "tests", ".tmp");
const logFile = path.join(tmpDir, "next.log");
const metaFile = path.join(tmpDir, "api-run.json");

const TEST_EMAIL_DOMAIN = "api-test.local";
const LIVE_SCHEME = "libsql://";
const BOOT_TIMEOUT_MS = 120000;
const DEFAULT_PORT = 3141;

function loadDotEnv(file) {
  if (!existsSync(file)) {
    return;
  }
  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function portFree(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(false));
    srv.listen(port, "127.0.0.1", () => srv.close(() => resolve(true)));
  });
}

async function findFreePort(start) {
  for (let port = start; port < start + 50; port++) {
    if (await portFree(port)) {
      return port;
    }
  }
  throw new Error("Could not find a free port for the API test server.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logTail() {
  return existsSync(logFile) ? readFileSync(logFile, "utf8").slice(-4000) : "(no log file)";
}

async function waitForServer(baseUrl, child) {
  const start = Date.now();
  while (Date.now() - start < BOOT_TIMEOUT_MS) {
    if (child.exitCode !== null) {
      throw new Error(`next dev exited early (code ${child.exitCode}).\n${logTail()}`);
    }
    try {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        signal: AbortSignal.timeout(3000),
      });
      const json = await res.json().catch(() => null);
      if (res.status === 401 && json && json.success === false) {
        return;
      }
    } catch {
      // Not ready yet (connection refused or still compiling).
    }
    await sleep(400);
  }
  throw new Error(`API server did not become ready in ${BOOT_TIMEOUT_MS}ms.\n${logTail()}`);
}

function killTree(pid) {
  if (process.platform === "win32") {
    try {
      spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      // Ignore; process may already be gone.
    }
  } else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Ignore.
    }
  }
}

async function cleanup(meta) {
  const { url, authToken, runId } = meta;
  const client = createClient({ url, authToken, concurrency: 1 });
  try {
    await client.execute("PRAGMA foreign_keys = ON;");
    const emailPattern = `%${runId}%@${TEST_EMAIL_DOMAIN}`;
    const emailResult = await client.execute("SELECT id FROM users WHERE email LIKE ?", [
      emailPattern,
    ]);
    const ids = emailResult.rows.map((row) => Number(row.id));
    const placeholders = ids.map(() => "?").join(",");

    if (ids.length > 0) {
      await client.execute(
        `DELETE FROM project_join_requests WHERE user_id IN (${placeholders})`,
        ids
      );
      await client.execute(
        `DELETE FROM project_members WHERE user_id IN (${placeholders})`,
        ids
      );
      await client.execute(
        `DELETE FROM project_join_requests WHERE project_id IN (SELECT id FROM projects WHERE owner_id IN (${placeholders}))`,
        ids
      );
      await client.execute(
        `DELETE FROM project_members WHERE project_id IN (SELECT id FROM projects WHERE owner_id IN (${placeholders}))`,
        ids
      );
      await client.execute(`DELETE FROM posts WHERE user_id IN (${placeholders})`, ids);
      await client.execute(
        `DELETE FROM connections WHERE requester_id IN (${placeholders}) OR addressee_id IN (${placeholders})`,
        [...ids, ...ids]
      );
      await client.execute(`DELETE FROM projects WHERE owner_id IN (${placeholders})`, ids);
      await client.execute(`DELETE FROM profiles WHERE user_id IN (${placeholders})`, ids);
      await client.execute(`DELETE FROM user_skills WHERE user_id IN (${placeholders})`, ids);
    }

    await client.execute("DELETE FROM skills WHERE name LIKE ?", [`TA-${runId}-%`]);
    await client.execute("DELETE FROM users WHERE email LIKE ?", [emailPattern]);

    const remaining = await client.execute("SELECT count(*) AS n FROM users WHERE email LIKE ?", [
      emailPattern,
    ]);
    if (Number(remaining.rows[0].n) !== 0) {
      console.error(`cleanup: ${remaining.rows[0].n} test user(s) still present`);
    }
  } finally {
    client.close();
  }
}

export default async function setup() {
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(logFile, "");

  loadDotEnv(path.join(root, ".env"));

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (process.env.API_TEST_ALLOW_LIVE !== "1") {
    throw new Error(
      "API e2e tests are destructive and need an explicit opt-in. Set API_TEST_ALLOW_LIVE=1, e.g.:\n" +
        '  $env:API_TEST_ALLOW_LIVE="1"; npm run test:api'
    );
  }
  if (!url || !url.startsWith(LIVE_SCHEME)) {
    throw new Error(
      `TURSO_DATABASE_URL must point at a remote libsql:// database to run API e2e tests (got "${url || "unset"}").`
    );
  }
  if (!authToken || !process.env.JWT_SECRET) {
    throw new Error("TURSO_AUTH_TOKEN and JWT_SECRET must be present in .env.");
  }

  console.error(
    [
      "============================================================",
      "  API e2e tests running against the LIVE database:",
      `    ${url}`,
      "  Records created will be removed during teardown.",
      "============================================================",
    ].join("\n")
  );

  const runId = generateRunId();
  const schemaClient = createClient({ url, authToken, concurrency: 1 });
  try {
    const check = await schemaClient.execute(
      "SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'users'"
    );
    if (Number(check.rows[0].n) === 0) {
      console.error("Empty database detected - applying schema from db/migrations ...");
      await migrate(drizzle(schemaClient), {
        migrationsFolder: path.join(root, "db", "migrations"),
      });
    }
  } finally {
    schemaClient.close();
  }

  const preferred =
    typeof process.env.API_TEST_PORT === "string"
      ? Number(process.env.API_TEST_PORT) || DEFAULT_PORT
      : DEFAULT_PORT;
  const port = await findFreePort(preferred);
  const baseUrl = `http://127.0.0.1:${port}`;

  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(
    process.execPath,
    [nextBin, "dev", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: root,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  child.stdout.on("data", (chunk) => appendFileSync(logFile, chunk));
  child.stderr.on("data", (chunk) => appendFileSync(logFile, chunk));
  child.on("exit", (code) => {
    console.error(`next dev exited with code ${code}`);
  });

  await waitForServer(baseUrl, child);

  const meta = { baseUrl, runId, port, url, authToken };
  writeFileSync(metaFile, JSON.stringify(meta));

  return async function teardown() {
    if (child.exitCode === null) {
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          try {
            killTree(child.pid);
          } catch {
            // already gone
          }
          resolve();
        }, 6000);
        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
        killTree(child.pid);
      });
    }
    try {
      await cleanup(meta);
    } finally {
      rmSync(metaFile, { force: true });
    }
  };
}