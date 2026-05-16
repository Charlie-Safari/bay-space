import {
  getNextMemberId,
  getStorageErrorMessage,
  isRefNameAvailable,
  listMembers,
} from "../../../lib/bay-space-db";
import {
  isValidUsername,
  normalizeUsername,
} from "../../../lib/bay-space-username";

type ApiMember = Awaited<ReturnType<typeof listMembers>>[number];

function publicMember(member: ApiMember) {
  return {
    member: member.member,
    name: member.name,
    refName: member.refName,
    roles: member.roles,
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
    return Response.json(
      { message: "member activation is temporarily offline" },
      { status: 503 },
    );
  }

  console.error(error);
  return Response.json({ message: "Unable to load members" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username") ?? searchParams.get("refName");

    if (username !== null) {
      const candidateUsername = username.trim();
      const valid = isValidUsername(candidateUsername);
      const normalizedUsername = normalizeUsername(candidateUsername);

      return Response.json(
        {
          available: valid
            ? await isRefNameAvailable(normalizedUsername)
            : false,
          valid,
        },
        { status: valid ? 200 : 400 },
      );
    }

    if (searchParams.get("next") === "true") {
      return Response.json({ member: await getNextMemberId() });
    }

    return Response.json({ members: (await listMembers()).map(publicMember) });
  } catch (error) {
    return membersErrorResponse(error);
  }
}
