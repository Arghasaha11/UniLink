import { requireUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/response";
import { validate } from "@/lib/validation";
import { searchUsers } from "@/services/user.service";
import { userListQuerySchema } from "@/validators/user";

export async function GET(request) {
  try {
    await requireUser();
    const query = validate(
      userListQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    const result = await searchUsers(query);
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}