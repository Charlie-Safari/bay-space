import { cookies } from "next/headers";
import {
  baySpaceSessionCookieName,
  getMemberFromSessionToken,
  revokeMemberSession,
} from "./bay-space-db";

const sessionMaxAge = 60 * 60 * 24 * 30;

function getCookieOptions() {
  return {
    httpOnly: true,
    maxAge: sessionMaxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function getSessionToken() {
  return (await cookies()).get(baySpaceSessionCookieName)?.value ?? "";
}

export async function getCurrentMember() {
  const token = await getSessionToken();

  return token ? getMemberFromSessionToken(token) : null;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(baySpaceSessionCookieName, token, getCookieOptions());
}

export async function clearSessionCookie() {
  (await cookies()).delete(baySpaceSessionCookieName);
}

export async function revokeCurrentSession() {
  const token = await getSessionToken();

  if (token) {
    await revokeMemberSession(token);
  }

  await clearSessionCookie();
}
