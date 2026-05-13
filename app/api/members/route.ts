import { getNextMemberId, listMembers } from "../../../lib/bay-space-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("next") === "true") {
    return Response.json({ member: await getNextMemberId() });
  }

  return Response.json({ members: await listMembers() });
}
