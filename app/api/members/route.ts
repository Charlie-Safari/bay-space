import {
  getNextMemberId,
  getStorageErrorMessage,
  listMembers,
} from "../../../lib/bay-space-db";

type ApiMember = Awaited<ReturnType<typeof listMembers>>[number];

function publicMember(member: ApiMember) {
  return {
    member: member.member,
    name: member.name,
    refName: member.refName,
    title: member.title,
    createdAt: member.createdAt,
    links: {
      x: member.links?.x?.display ? member.links.x : undefined,
      linkedin: member.links?.linkedin?.display
        ? member.links.linkedin
        : undefined,
      github: member.links?.github?.display ? member.links.github : undefined,
      youtube: member.links?.youtube?.display ? member.links.youtube : undefined,
    },
  };
}

function membersErrorResponse(error: unknown) {
  const storageMessage = getStorageErrorMessage(error);

  if (storageMessage) {
    console.error(storageMessage);
    return Response.json({ message: storageMessage }, { status: 503 });
  }

  console.error(error);
  return Response.json({ message: "Unable to load members" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get("next") === "true") {
      return Response.json({ member: await getNextMemberId() });
    }

    return Response.json({ members: (await listMembers()).map(publicMember) });
  } catch (error) {
    return membersErrorResponse(error);
  }
}
