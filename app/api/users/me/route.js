import { requireUser } from "@/lib/auth";
import { fail, handleApiError, ok } from "@/lib/response";
import { validate } from "@/lib/validation";
import { getPublicUserById, updateOwnProfile } from "@/services/user.service";
import { updateProfileSchema } from "@/validators/user";

export async function GET() {
  try {
    const { userId } = await requireUser();
    const user = await getPublicUserById(userId, { withEmail: true });
    return ok({ user });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request) {
  try {
    const { userId } = await requireUser();

    let body;
    try {
      body = await request.json();
    } catch {
      return fail(400, "Invalid JSON body", "INVALID_JSON");
    }

    const data = validate(updateProfileSchema, body);
    const user = await updateOwnProfile(userId, data);
    return ok({ user });
  } catch (err) {
    return handleApiError(err);
  }
}