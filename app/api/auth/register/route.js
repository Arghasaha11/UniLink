import { cookies } from "next/headers";
import { AUTH_COOKIE, authCookieOptions } from "@/lib/auth";
import { signAccessToken } from "@/lib/jwt";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleApiError, ok } from "@/lib/response";
import { validate } from "@/lib/validation";
import { register } from "@/services/auth.service";
import { registerSchema } from "@/validators/auth";

export async function POST(request) {
  try {
    const limited = rateLimit(request, { max: 10 });
    if (limited) {
      return Response.json(
        {
          success: false,
          error: {
            message: "Too many attempts. Please try again later.",
            code: "RATE_LIMITED",
          },
        },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return fail(400, "Invalid JSON body", "INVALID_JSON");
    }

    const data = validate(registerSchema, body);
    const user = await register(data);
    const token = await signAccessToken({ userId: user.id });

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE, token, authCookieOptions());

    return ok({ user }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}