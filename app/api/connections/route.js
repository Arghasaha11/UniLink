import { requireUser } from "@/lib/auth";
import { fail, handleApiError, ok } from "@/lib/response";
import { validate } from "@/lib/validation";
import {
  listConnections,
  listIncomingRequests,
  listOutgoingRequests,
  sendConnectionRequest,
} from "@/services/connection.service";
import {
  connectionStatusQuerySchema,
  sendConnectionSchema,
} from "@/validators/connection";

export async function GET(request) {
  try {
    const { userId } = await requireUser();
    const query = validate(
      connectionStatusQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );

    let result;
    if (query.status === "incoming") {
      result = await listIncomingRequests(userId, query);
    } else if (query.status === "outgoing") {
      result = await listOutgoingRequests(userId, query);
    } else {
      result = await listConnections(userId, query);
    }
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request) {
  try {
    const { userId } = await requireUser();

    let body;
    try {
      body = await request.json();
    } catch {
      return fail(400, "Invalid JSON body", "INVALID_JSON");
    }

    const data = validate(sendConnectionSchema, body);
    const connection = await sendConnectionRequest(userId, data.userId);
    return ok({ connection }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}