import { ApiError } from "./api-error";

export function ok(data, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function fail(status, message, code = "ERROR", details) {
  return Response.json(
    { success: false, error: { message, code, ...(details ? { details } : {}) } },
    { status }
  );
}

function constraintMessage(err) {
  const messages = [];
  let current = err;
  const seen = new Set();
  while (current && !seen.has(current)) {
    seen.add(current);
    if (typeof current.message === "string") {
      messages.push(current.message);
    }
    current = current.cause;
  }
  return messages.join("\n");
}

function classifySqliteConstraint(err) {
  // libsql reports `code: "SQLITE_CONSTRAINT"` for every constraint violation,
  // so we must distinguish them by message text. Nothing here should match the
  // generic "SQLITE_CONSTRAINT" prefix on its own. Drivers can also wrap the
  // original error (drizzle wraps libsql errors as "Failed query: ..." with
  // the real message on `err.cause`), so we walk the whole cause chain.
  const message = constraintMessage(err);
  if (
    message.includes("UNIQUE constraint failed") ||
    message.includes("SQLITE_CONSTRAINT_UNIQUE") ||
    message.includes("SQLITE_CONSTRAINT_PRIMARYKEY")
  ) {
    return { status: 409, message: "A record with this value already exists", code: "CONFLICT" };
  }
  if (
    message.includes("FOREIGN KEY constraint failed") ||
    message.includes("SQLITE_CONSTRAINT_FOREIGNKEY")
  ) {
    return { status: 404, message: "Referenced record not found", code: "NOT_FOUND" };
  }
  return null;
}

export function handleApiError(err) {
  if (err instanceof ApiError) {
    return fail(err.status, err.message, err.code, err.details);
  }
  const constraint = classifySqliteConstraint(err);
  if (constraint) {
    return fail(constraint.status, constraint.message, constraint.code);
  }
  console.error(err);
  return fail(500, "Something went wrong", "INTERNAL_SERVER_ERROR");
}