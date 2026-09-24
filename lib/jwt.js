import { SignJWT, jwtVerify } from "jose";

const TOKEN_EXPIRES_IN = "7d";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken({ userId }) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRES_IN)
    .sign(getSecret());
}

export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload;
}