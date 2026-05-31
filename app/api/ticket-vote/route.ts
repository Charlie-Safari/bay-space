import {
  getMemberTicketVoteNextAt,
  getStorageErrorMessage,
  listMemberTicketedPostIds,
} from "../../../lib/bay-space-db";
import { getCurrentMember } from "../../../lib/bay-space-session";

function getAvailability(nextAt: number, now = Date.now()) {
  return {
    canVote: !nextAt || nextAt <= now,
    nextAt,
    remainingMs: Math.max(0, nextAt - now),
  };
}

export async function GET() {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    return Response.json({
      ...getAvailability(await getMemberTicketVoteNextAt(member.member)),
      member: member.member,
      postIds: await listMemberTicketedPostIds(member.member),
    });
  } catch (error) {
    const storageMessage = getStorageErrorMessage(error);

    if (storageMessage) {
      console.error(storageMessage);
      return Response.json({ message: storageMessage }, { status: 503 });
    }

    console.error(error);
    return Response.json(
      { message: "Unable to load ticket vote" },
      { status: 500 },
    );
  }
}
