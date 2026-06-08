import { revalidatePath } from "next/cache";
import {
  getMemberCryptiTicketVoteNextAt,
  getStorageErrorMessage,
  listMemberCryptiTicketedPostIds,
  startMemberCryptiTicketVoteCooldown,
  toggleCryptiPostTicketVote,
} from "../../../../../lib/bay-space-db";
import { getCurrentMember } from "../../../../../lib/bay-space-session";
import { isCrypti } from "../../../../../lib/bay-space-roles";

const cryptiTicketVoteCooldownMs = 24 * 60 * 60 * 1000;

type CryptiTicketVoteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: CryptiTicketVoteContext,
) {
  try {
    void request;
    const { id } = await context.params;
    const member = await getCurrentMember();

    if (!member || !isCrypti(member.roles)) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();
    const nextTicketVoteAt = await getMemberCryptiTicketVoteNextAt(
      member.member,
    );
    const isTicketed = (await listMemberCryptiTicketedPostIds(member.member))
      .includes(id);

    if (!isTicketed && nextTicketVoteAt > now) {
      return Response.json(
        {
          canVote: false,
          member: member.member,
          nextTicketVoteAt,
          remainingMs: nextTicketVoteAt - now,
        },
        { status: 429 },
      );
    }

    const result = await toggleCryptiPostTicketVote(member.member, id);

    if (!result) {
      return Response.json({ message: "Post not found" }, { status: 404 });
    }

    const updatedNextTicketVoteAt = result.ticketed
      ? await startMemberCryptiTicketVoteCooldown(
          member.member,
          now + cryptiTicketVoteCooldownMs,
        )
      : nextTicketVoteAt;

    revalidatePath("/crypti");

    return Response.json({
      member: member.member,
      nextTicketVoteAt: updatedNextTicketVoteAt,
      post: result.post,
      ticketed: result.ticketed,
      ticketVotes: result.ticketVotes,
    });
  } catch (error) {
    const storageMessage = getStorageErrorMessage(error);

    if (storageMessage) {
      console.error(storageMessage);
      return Response.json({ message: storageMessage }, { status: 503 });
    }

    console.error(error);
    return Response.json(
      { message: "Unable to vote Crypti ticket" },
      { status: 500 },
    );
  }
}
