import { getMember, verifyMemberPin } from "../../../lib/bay-space-db";

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

    return Response.json({ member });
  } catch {
    return Response.json({ message: "Unable to authenticate" }, { status: 500 });
  }
}
