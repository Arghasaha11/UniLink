import { requireUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/response";
import { validate } from "@/lib/validation";
import { removeProjectMember } from "@/services/project.service";
import { projectMemberParamsSchema } from "@/validators/project";

export async function DELETE(request, { params }) {
  try {
    const { userId } = await requireUser();
    const { id, userId: memberUserId } = validate(
      projectMemberParamsSchema,
      await params
    );
    const project = await removeProjectMember(id, userId, memberUserId);
    return ok({ project });
  } catch (err) {
    return handleApiError(err);
  }
}