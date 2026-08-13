import {
  getStorageErrorMessage,
  setDirectMessageBlock,
} from "../../../../lib/bay-space-db";
import { getCurrentMember } from "../../../../lib/bay-space-session";

function inboxBlockErrorResponse(error: unknown) {
  const storageMessage = getStorageErrorMessage(error);

  if (storageMessage) {
    console.error(storageMessage);
    return Response.json({ message: storageMessage }, { status: 503 });
  }

  console.error(error);
  return Response.json(
    { message: "Unable to update inbox block" },
    { status: 500 },
  );
}

export async function PATCH(request: Request) {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      blocked?: boolean;
      member?: string;
    };
    const blockedMember = body.member?.trim() ?? "";

    if (!blockedMember) {
      return Response.json({ message: "Member required" }, { status: 400 });
    }

    const result = await setDirectMessageBlock(
      member.member,
      blockedMember,
      body.blocked === true,
    );

    return result
      ? Response.json(result)
      : Response.json({ message: "Member not found" }, { status: 404 });
  } catch (error) {
    return inboxBlockErrorResponse(error);
  }
}
