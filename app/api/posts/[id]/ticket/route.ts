import {
  getMemberTicketVoteNextAt,
  getStorageErrorMessage,
  incrementPostTicketVoteCount,
  startMemberTicketVoteCooldown,
} from "../../../../../lib/bay-space-db";
import { getCurrentMember } from "../../../../../lib/bay-space-session";
import { revalidatePath } from "next/cache";

const ticketVoteCooldownMs = 4 * 60 * 60 * 1000;

type TicketVoteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: TicketVoteContext) {
  try {
    void request;
    const { id } = await context.params;
    const member = await getCurrentMember();
    const now = Date.now();

    if (member) {
      const nextTicketVoteAt = await getMemberTicketVoteNextAt(member.member);

      if (nextTicketVoteAt > now) {
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
    }

    const result = await incrementPostTicketVoteCount(id);

    if (!result) {
      return Response.json({ message: "Post not found" }, { status: 404 });
    }

    const nextTicketVoteAt = member
      ? await startMemberTicketVoteCooldown(
          member.member,
          now + ticketVoteCooldownMs,
        )
      : now + ticketVoteCooldownMs;

    revalidatePath("/daily-food");
    revalidatePath("/news");

    return Response.json({
      member: member?.member,
      nextTicketVoteAt,
      post: result.post,
      ticketVotes: result.ticketVotes,
    });
  } catch (error) {
    const storageMessage = getStorageErrorMessage(error);

    if (storageMessage) {
      console.error(storageMessage);
      return Response.json({ message: storageMessage }, { status: 503 });
    }

    console.error(error);
    return Response.json({ message: "Unable to vote ticket" }, { status: 500 });
  }
}
