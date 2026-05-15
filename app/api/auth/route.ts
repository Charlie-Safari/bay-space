import {
  createMemberSession,
  getMember,
  getStorageErrorMessage,
  verifyMemberPin,
} from "../../../lib/bay-space-db";
import { setSessionCookie } from "../../../lib/bay-space-session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { member?: string; pin?: string };
    const memberId = body.member ?? "";
    const savedMember = await getMember(memberId);

    if (!savedMember) {
      return Response.json({ message: "Member not found" }, { status: 404 });
    }

    const member = await verifyMemberPin(memberId, body.pin ?? "");

    if (!member) {
      return Response.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const sessionToken = await createMemberSession(member.member);

    if (!sessionToken) {
      return Response.json({ message: "Unable to create session" }, { status: 500 });
    }

    await setSessionCookie(sessionToken);

    return Response.json({ member });
  } catch (error) {
    const storageMessage = getStorageErrorMessage(error);

    if (storageMessage) {
      console.error(storageMessage);
      return Response.json({ message: storageMessage }, { status: 503 });
    }

    console.error(error);
    return Response.json({ message: "Unable to authenticate" }, { status: 500 });
  }
}
