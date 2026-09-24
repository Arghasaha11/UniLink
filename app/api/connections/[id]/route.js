import { requireUser } from "@/lib/auth";
import { fail, handleApiError, ok } from "@/lib/response";
import { validate } from "@/lib/validation";
import {
  acceptConnectionRequest,
  rejectConnectionRequest,
  removeConnection,
} from "@/services/connection.service";
import {
  connectionParamsSchema,
  resolveConnectionSchema,
} from "@/validators/connection";

export async function PATCH(request, { params }) {
  try {
    const { userId } = await requireUser();
    const { id } = validate(connectionParamsSchema, await params);

    let body;
    try {
      body = await request.json();
    } catch {
      return fail(400, "Invalid JSON body", "INVALID_JSON");
    }

    const { action } = validate(resolveConnectionSchema, body);
    let connection;
    if (action === "accept") {
      connection = await acceptConnectionRequest(userId, id);
    } else {
      connection = await rejectConnectionRequest(userId, id);
    }
    return ok({ connection });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { userId } = await requireUser();
    const { id } = validate(connectionParamsSchema, await params);
    await removeConnection(userId, id);
    return ok({ removed: true });
  } catch (err) {
    return handleApiError(err);
  }
}