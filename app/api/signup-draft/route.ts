import { setSignupDraftCookie } from "../../../lib/bay-space-signup-draft";
import {
  getStorageErrorMessage,
  isRefNameAvailable,
} from "../../../lib/bay-space-db";
import {
  isValidUsername,
  normalizeUsername,
} from "../../../lib/bay-space-username";
import { needsPrescreenAccess } from "../../../lib/bay-space-roles";

function normalizeMember(value: string) {
  return value.replace(/\D/g, "").slice(0, 5).padStart(5, "0");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      member?: string;
      name?: string;
      pin?: string;
      refName?: string;
      roles?: string;
      title?: string;
    };
    const pin = body.pin ?? "";

    if (!pin.trim()) {
      return Response.json({ message: "PIN required" }, { status: 400 });
    }

    const member = normalizeMember(body.member ?? "33332");
    const candidateRefName = (body.refName ?? body.name ?? "").trim();

    if (
      !isValidUsername(candidateRefName) ||
      !(await isRefNameAvailable(candidateRefName))
    ) {
      return Response.json(
        { message: "username unavailable" },
        { status: 409 },
      );
    }

    const refName = normalizeUsername(candidateRefName);
    const name = refName;
    const roles = (body.roles ?? "").trim() || "curious reader";
    const title = (body.title ?? "Curious Reader").trim().slice(0, 80);

    await setSignupDraftCookie({
      member,
      name,
      pin,
      refName,
      roles,
      title,
    });

    const params = new URLSearchParams({
      member,
      name,
      ref: refName,
      roles,
      title,
    });
    const needsCode = needsPrescreenAccess(roles);

    return Response.json({
      nextPath: `/join-the-circle/member/${
        needsCode ? "creator-code" : "report"
      }?${params.toString()}`,
    });
  } catch (error) {
    const storageMessage = getStorageErrorMessage(error);

    if (storageMessage) {
      console.error(storageMessage);
      return Response.json({ message: storageMessage }, { status: 503 });
    }

    console.error(error);
    return Response.json({ message: "Unable to save signup" }, { status: 500 });
  }
}
