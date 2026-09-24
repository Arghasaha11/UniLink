import { z } from "zod";

// bcrypt only uses the first 72 bytes of the input, silently ignoring the
// rest. Longer passwords would let two different values that share a 72-byte
// prefix authenticate as the same credential, so we cap both endpoints at the
// byte limit (character counts are not enough: multibyte characters exceed it).
const passwordRule = z
  .string()
  .refine((value) => new TextEncoder().encode(value).byteLength <= 72, {
    message: "Password must be 72 bytes or fewer",
  });

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    email: z.email("A valid email is required"),
    password: passwordRule.refine(
      (value) => value.length >= 8,
      "Password must be at least 8 characters"
    ),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.email("A valid email is required"),
    password: passwordRule.refine(
      (value) => value.length >= 1,
      "Password is required"
    ),
  })
  .strict();