import { requireUser } from "@/lib/auth";
import { fail, handleApiError, ok } from "@/lib/response";
import { validate } from "@/lib/validation";
import { createProject, listProjects } from "@/services/project.service";
import {
  createProjectSchema,
  projectListQuerySchema,
} from "@/validators/project";

export async function GET(request) {
  try {
    await requireUser();
    const query = validate(
      projectListQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    const result = await listProjects(query);
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

    const data = validate(createProjectSchema, body);
    const project = await createProject(userId, data);
    return ok({ project }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}