import { z } from "zod";
import { idParamsSchema, paginationSchema } from "./common";

export const userListQuerySchema = paginationSchema.extend({
  query: z.string().trim().max(100).optional(),
});

export const userParamsSchema = idParamsSchema;

export const updateProfileSchema = z
  .object({
    bio: z.string().trim().max(1000).nullish(),
    department: z.string().trim().max(100).nullish(),
    year: z.string().trim().max(50).nullish(),
    skills: z.array(z.string().trim().min(1).max(50)).max(50).optional(),
  })
  .strict();