export class ApiError extends Error {
  constructor(status = 500, message = "Internal server error", code = "INTERNAL_SERVER_ERROR", details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}