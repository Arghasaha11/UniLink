import { z } from "zod";

export const projectListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const projectParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createProjectSchema = z
  .object({
    name: z.string().trim().min(1, "Project name is required").max(150),
    description: z.string().trim().max(5000).nullish(),
  })
  .strict();

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(5000).nullish(),
  })
  .strict();

export const addProjectMemberSchema = z
  .object({
    userId: z.coerce.number().int().positive(),
  })
  .strict();

export const projectMemberParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
});

export const joinRequestParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  requestId: z.coerce.number().int().positive(),
});

export const decideJoinRequestSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
  })
  .strict();