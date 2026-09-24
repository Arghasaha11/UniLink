import { requireUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/response";
import { getPublicUserById } from "@/services/user.service";

export async function GET() {
  try {
    const { userId } = await requireUser();
    const user = await getPublicUserById(userId, { withEmail: true });
    return ok({ user });
  } catch (err) {
    return handleApiError(err);
  }
}