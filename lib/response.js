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

function isUniqueConstraintError(err) {
  const message = err?.message || "";
  return (
    message.includes("UNIQUE constraint failed") || message.includes("SQLITE_CONSTRAINT")
  );
}

export function handleApiError(err) {
  if (err instanceof ApiError) {
    return fail(err.status, err.message, err.code, err.details);
  }
  if (isUniqueConstraintError(err)) {
    return fail(409, "A record with this value already exists", "CONFLICT");
  }
  console.error(err);
  return fail(500, "Something went wrong", "INTERNAL_SERVER_ERROR");
}