import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-error";
import { handleApiError } from "@/lib/response";

describe("handleApiError", () => {
  it("passes through ApiError", async () => {
    const res = handleApiError(new ApiError(403, "nope", "FORBIDDEN"));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });

  it("maps unique constraint violations to 409 CONFLICT", async () => {
    for (const message of [
      "SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email",
      "UNIQUE constraint failed: users.email",
      "SQLITE_CONSTRAINT_UNIQUE: users.email",
    ]) {
      const res = handleApiError(new Error(message));
      expect(res.status).toBe(409);
      expect((await res.json()).error.code).toBe("CONFLICT");
    }
  });

  it("maps foreign key violations to 404 NOT_FOUND instead of 409", async () => {
    for (const message of [
      "SQLITE_CONSTRAINT: FOREIGN KEY constraint failed",
      "FOREIGN KEY constraint failed",
      "SQLITE_CONSTRAINT_FOREIGNKEY: conns.uid",
    ]) {
      const res = handleApiError(new Error(message));
      expect(res.status).toBe(404);
      expect((await res.json()).error.code).toBe("NOT_FOUND");
    }
  });

  it("does not treat generic constraint violations as conflicts", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = handleApiError(new Error("SQLITE_CONSTRAINT: CHECK constraint failed"));
      expect(res.status).toBe(500);
      expect((await res.json()).error.code).toBe("INTERNAL_SERVER_ERROR");
    } finally {
      spy.mockRestore();
    }
  });

  it("classifies constraint text nested in a wrapped error (drizzle-style)", async () => {
    const outer = new Error(
      'Failed query: insert into "connections" ... params: 1,999999999,pending'
    );
    outer.cause = new Error("SQLITE_CONSTRAINT: SQLite error: FOREIGN KEY constraint failed");
    const res = handleApiError(outer);
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });
});