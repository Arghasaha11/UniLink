import { compare, hash } from "bcryptjs";

const SALT_ROUNDS = 10;

export function hashPassword(password) {
  return hash(password, SALT_ROUNDS);
}

export function verifyPassword(password, passwordHash) {
  return compare(password, passwordHash);
}