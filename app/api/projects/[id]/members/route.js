import { requireUser } from "@/lib/auth";
import { fail, handleApiError, ok } from "@/lib/response";
import { validate } from "@/lib/validation";
import { addProjectMember } from "@/services/project.service";
import {
  addProjectMemberSchema,
  projectParamsSchema,
} from "@/validators/project";

export async function POST(request, { params }) {
  try {
    const { userId } = await requireUser();
    const { id } = validate(projectParamsSchema, await params);

    let body;
    try {
      body = await request.json();
    } catch {
      return fail(400, "Invalid JSON body", "INVALID_JSON");
    }

    const data = validate(addProjectMemberSchema, body);
    const project = await addProjectMember(id, userId, data.userId);
    return ok({ project });
  } catch (err) {
    return handleApiError(err);
  }
}