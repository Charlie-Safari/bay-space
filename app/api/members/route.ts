import { createMember, listMembers } from "../../../lib/bay-space-db";

export async function GET() {
  return Response.json({ members: await listMembers() });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string };
    const member = await createMember({ name: body.name ?? "" });

    return Response.json({ member }, { status: 201 });
  } catch {
    return Response.json({ message: "Unable to create member" }, { status: 500 });
  }
}
