import { requireUser } from "@/lib/auth";
import { fail, handleApiError, ok } from "@/lib/response";
import { validate } from "@/lib/validation";
import { createPost, listPosts } from "@/services/post.service";
import { createPostSchema, postListQuerySchema } from "@/validators/post";

export async function GET(request) {
  try {
    await requireUser();
    const query = validate(
      postListQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    const result = await listPosts(query);
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

    const data = validate(createPostSchema, body);
    const post = await createPost(userId, data.content);
    return ok({ post }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}