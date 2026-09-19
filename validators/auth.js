import { z } from "zod";

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    email: z.email("A valid email is required"),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.email("A valid email is required"),
    password: z.string().min(1, "Password is required").max(128),
  })
  .strict();