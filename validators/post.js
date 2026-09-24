import { z } from "zod";
import { idParamsSchema } from "./common";

export const postListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const createPostSchema = z
  .object({
    content: z.string().trim().min(1, "Post content is required").max(5000),
  })
  .strict();

export const updatePostSchema = z
  .object({
    content: z.string().trim().min(1, "Post content is required").max(5000),
  })
  .strict();

export const postParamsSchema = idParamsSchema;