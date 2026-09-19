import { requireUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/response";
import { validate } from "@/lib/validation";
import { getPublicUserById } from "@/services/user.service";
import { userParamsSchema } from "@/validators/user";

export async function GET(request, { params }) {
  try {
    const session = await requireUser();
    const { id } = validate(userParamsSchema, await params);
    const user = await getPublicUserById(id);
    return ok({ user, isMe: session.userId === id });
  } catch (err) {
    return handleApiError(err);
  }
}