import { ApiError } from "@/lib/api-error";
import { verifyPassword } from "@/lib/password";
import {
  createUser,
  getPublicUserById,
  getUserByEmail,
  toPublicUser,
} from "./user.service";

export async function register({ fullName, email, password }) {
  const user = await createUser({ fullName, email, password });
  return toPublicUser(user, { withEmail: true });
}

export async function authenticate({ email, password }) {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }
  return getPublicUserById(user.id, { withEmail: true });
}