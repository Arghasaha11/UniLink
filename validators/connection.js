import { z } from "zod";
import { idParamsSchema } from "./common";

export const sendConnectionSchema = z
  .object({
    userId: z.coerce.number().int().positive(),
  })
  .strict();

export const connectionParamsSchema = idParamsSchema;

export const resolveConnectionSchema = z
  .object({
    action: z.enum(["accept", "reject"]),
  })
  .strict();

export const connectionStatusQuerySchema = z.object({
  status: z.enum(["connected", "incoming", "outgoing"]).default("connected"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});