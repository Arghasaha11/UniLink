import { requireUser } from "@/lib/auth";
import { fail, handleApiError, ok } from "@/lib/response";
import { validate } from "@/lib/validation";
import { deletePost, getPublicPostById, updatePost } from "@/services/post.service";
import { postParamsSchema, updatePostSchema } from "@/validators/post";

export async function GET(request, { params }) {
  try {
    await requireUser();
    const { id } = validate(postParamsSchema, await params);
    const post = await getPublicPostById(id);
    return ok({ post });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { userId } = await requireUser();
    const { id } = validate(postParamsSchema, await params);

    let body;
    try {
      body = await request.json();
    } catch {
      return fail(400, "Invalid JSON body", "INVALID_JSON");
    }

    const data = validate(updatePostSchema, body);
    const post = await updatePost(id, userId, data);
    return ok({ post });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { userId } = await requireUser();
    const { id } = validate(postParamsSchema, await params);
    await deletePost(id, userId);
    return ok({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}