import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { ApiError } from "@/lib/api-error";
import { toPublicUser } from "./user.service";

export function toPublicPost(post) {
  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: toPublicUser({ ...post.author }),
  };
}

export async function getPostById(id) {
  return db.query.posts.findFirst({
    where: (p, { eq }) => eq(p.id, id),
    with: {
      author: { with: { profile: true } },
    },
  });
}

export async function getPublicPostById(id) {
  const post = await getPostById(id);
  if (!post) {
    throw new ApiError(404, "Post not found", "NOT_FOUND");
  }
  return toPublicPost(post);
}

export async function createPost(userId, content) {
  const [post] = await db
    .insert(posts)
    .values({ userId, content })
    .returning();
  const created = await getPostById(post.id);
  return toPublicPost(created);
}

export async function listPosts({ page, limit }) {
  const rows = await db.query.posts.findMany({
    orderBy: (p, { desc }) => [desc(p.createdAt), desc(p.id)],
    limit,
    offset: (page - 1) * limit,
    with: {
      author: { with: { profile: true } },
    },
  });

  const total = await db.$count(posts);

  return {
    posts: rows.map(toPublicPost),
    total,
    page,
    limit,
  };
}

export async function updatePost(id, userId, { content }) {
  const existing = await getPostById(id);
  if (!existing) {
    throw new ApiError(404, "Post not found", "NOT_FOUND");
  }
  if (existing.userId !== userId) {
    throw new ApiError(403, "You can only update your own posts", "FORBIDDEN");
  }
  const [updated] = await db
    .update(posts)
    .set({ content, updatedAt: Date.now() })
    .where(eq(posts.id, id))
    .returning();
  const fresh = await getPostById(updated.id);
  return toPublicPost(fresh);
}

export async function deletePost(id, userId) {
  const existing = await getPostById(id);
  if (!existing) {
    throw new ApiError(404, "Post not found", "NOT_FOUND");
  }
  if (existing.userId !== userId) {
    throw new ApiError(403, "You can only delete your own posts", "FORBIDDEN");
  }
  await db.delete(posts).where(eq(posts.id, id)).run();
}