import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";

type SignupDraft = {
  member: string;
  name: string;
  pinHash: string;
  pinSalt: string;
  refName: string;
  roles: string;
  title: string;
};

type NewSignupDraft = Omit<SignupDraft, "pinHash" | "pinSalt"> & {
  pin: string;
};

const signupDraftCookieName = "bay-space-signup-draft";
const signupDraftMaxAge = 60 * 30;

function getCookieOptions() {
  return {
    httpOnly: true,
    maxAge: signupDraftMaxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

function hashPin(pin: string, salt: string) {
  return createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

function encodeDraft(draft: SignupDraft) {
  return Buffer.from(JSON.stringify(draft), "utf8").toString("base64url");
}

function decodeDraft(value: string) {
  try {
    return JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as SignupDraft;
  } catch {
    return null;
  }
}

export async function setSignupDraftCookie(input: NewSignupDraft) {
  const pinSalt = randomBytes(16).toString("hex");
  const draft: SignupDraft = {
    member: input.member,
    name: input.name,
    pinHash: hashPin(input.pin, pinSalt),
    pinSalt,
    refName: input.refName,
    roles: input.roles,
    title: input.title,
  };

  (await cookies()).set(signupDraftCookieName, encodeDraft(draft), getCookieOptions());
}

export async function getSignupDraftCookie() {
  const value = (await cookies()).get(signupDraftCookieName)?.value;

  return value ? decodeDraft(value) : null;
}

export async function clearSignupDraftCookie() {
  (await cookies()).delete(signupDraftCookieName);
}

export function verifySignupDraftPin(draft: SignupDraft, pin: string) {
  return hashPin(pin, draft.pinSalt) === draft.pinHash;
}
