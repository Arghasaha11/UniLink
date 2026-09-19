import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/response";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE);
    return ok({ loggedOut: true });
  } catch (err) {
    return handleApiError(err);
  }
}