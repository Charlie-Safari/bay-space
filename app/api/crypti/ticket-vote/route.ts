import {
  getMemberCryptiTicketVoteNextAt,
  getStorageErrorMessage,
  listMemberCryptiTicketedPostIds,
} from "../../../../lib/bay-space-db";
import { getCurrentMember } from "../../../../lib/bay-space-session";
import { canAccessCrypti } from "../../../../lib/bay-space-roles";

export async function GET() {
  try {
    const member = await getCurrentMember();

    if (!member || !canAccessCrypti(member)) {
      return Response.json(
        { member: null, nextAt: 0, postIds: [] },
        { status: 401 },
      );
    }

    return Response.json({
      member: member.member,
      nextAt: await getMemberCryptiTicketVoteNextAt(member.member),
      postIds: await listMemberCryptiTicketedPostIds(member.member),
    });
  } catch (error) {
    const storageMessage = getStorageErrorMessage(error);

    if (storageMessage) {
      console.error(storageMessage);
      return Response.json({ message: storageMessage }, { status: 503 });
    }

    console.error(error);
    return Response.json(
      { message: "Unable to load Crypti ticket vote" },
      { status: 500 },
    );
  }
}
