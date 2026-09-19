import { describe, expect, it } from "vitest";
import { validate } from "@/lib/validation";
import { idParamsSchema, paginationSchema } from "@/validators/common";
import { registerSchema, loginSchema } from "@/validators/auth";
import { updateProfileSchema } from "@/validators/user";
import { ApiError } from "@/lib/api-error";

describe("common validators", () => {
  it("coerces id params to positive integers", () => {
    expect(validate(idParamsSchema, { id: "12" })).toEqual({ id: 12 });
  });

  it("rejects non-positive ids", () => {
    expect(() => validate(idParamsSchema, { id: 0 })).toThrow(ApiError);
    expect(() => validate(idParamsSchema, { id: "-3" })).toThrow(ApiError);
  });

  it("applies pagination defaults", () => {
    expect(validate(paginationSchema, {})).toEqual({ page: 1, limit: 10 });
  });
});

describe("auth validators", () => {
  it("validates a register payload", () => {
    const data = validate(registerSchema, {
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      password: "longenough",
    });
    expect(data).toEqual({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      password: "longenough",
    });
  });

  it("rejects a bad email", () => {
    expect(() =>
      validate(loginSchema, { email: "not-an-email", password: "x" })
    ).toThrow(ApiError);
  });

  it("rejects unknown keys", () => {
    expect(() =>
      validate(registerSchema, {
        fullName: "Ada",
        email: "a@b.com",
        password: "longenough",
        admin: true,
      })
    ).toThrow(/Validation failed/);
  });
});

describe("profile validator", () => {
  it("accepts nullish optional fields for clearing values", () => {
    const data = validate(updateProfileSchema, {
      bio: null,
      skills: [" JS ", "js", "sql", "SQL "],
    });
    expect(data.bio).toBeNull();
    expect(data.skills).toHaveLength(4);
  });
});