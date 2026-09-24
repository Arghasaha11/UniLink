import { requireUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/response";
import { validate } from "@/lib/validation";
import { createJoinRequest, listJoinRequests } from "@/services/project.service";
import { projectParamsSchema } from "@/validators/project";

export async function GET(request, { params }) {
  try {
    const { userId } = await requireUser();
    const { id } = validate(projectParamsSchema, await params);
    const joinRequests = await listJoinRequests(id, userId);
    return ok({ joinRequests });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request, { params }) {
  try {
    const { userId } = await requireUser();
    const { id } = validate(projectParamsSchema, await params);
    const joinRequest = await createJoinRequest(id, userId);
    return ok({ joinRequest }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}