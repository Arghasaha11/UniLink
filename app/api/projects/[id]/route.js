import { requireUser } from "@/lib/auth";
import { fail, handleApiError, ok } from "@/lib/response";
import { validate } from "@/lib/validation";
import {
  deleteProject,
  getPublicProject,
  updateProject,
} from "@/services/project.service";
import {
  projectParamsSchema,
  updateProjectSchema,
} from "@/validators/project";

export async function GET(request, { params }) {
  try {
    await requireUser();
    const { id } = validate(projectParamsSchema, await params);
    const project = await getPublicProject(id);
    return ok({ project });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { userId } = await requireUser();
    const { id } = validate(projectParamsSchema, await params);

    let body;
    try {
      body = await request.json();
    } catch {
      return fail(400, "Invalid JSON body", "INVALID_JSON");
    }

    const data = validate(updateProjectSchema, body);
    const project = await updateProject(id, userId, data);
    return ok({ project });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { userId } = await requireUser();
    const { id } = validate(projectParamsSchema, await params);
    await deleteProject(id, userId);
    return ok({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}