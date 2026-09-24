import { ApiError } from "./api-error";

export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "$",
      message: issue.message,
    }));
    throw new ApiError(422, "Validation failed", "VALIDATION_ERROR", issues);
  }
  return result.data;
}