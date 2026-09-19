import { requireUser } from "@/lib/auth";
import { fail, handleApiError, ok } from "@/lib/response";
import { validate } from "@/lib/validation";
import { decideJoinRequest } from "@/services/project.service";
import {
  decideJoinRequestSchema,
  joinRequestParamsSchema,
} from "@/validators/project";

export async function PATCH(request, { params }) {
  try {
    const { userId } = await requireUser();
    const { id, requestId } = validate(joinRequestParamsSchema, await params);

    let body;
    try {
      body = await request.json();
    } catch {
      return fail(400, "Invalid JSON body", "INVALID_JSON");
    }

    const { action } = validate(decideJoinRequestSchema, body);
    const project = await decideJoinRequest(id, userId, requestId, action);
    return ok({ project });
  } catch (err) {
    return handleApiError(err);
  }
}