import {
  getMemberTicketVoteNextAt,
  getStorageErrorMessage,
  listMemberTicketedPostIds,
  startMemberTicketVoteCooldown,
  togglePostTicketVote,
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

    if (!member) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();
    const nextTicketVoteAt = await getMemberTicketVoteNextAt(member.member);
    const isTicketed = (await listMemberTicketedPostIds(member.member)).includes(
      id,
    );

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

    const result = await togglePostTicketVote(member.member, id);

    if (!result) {
      return Response.json({ message: "Post not found" }, { status: 404 });
    }

    const updatedNextTicketVoteAt = result.ticketed
      ? await startMemberTicketVoteCooldown(
          member.member,
          now + ticketVoteCooldownMs,
        )
      : nextTicketVoteAt;

    revalidatePath("/daily-food");
    revalidatePath("/facts-on-news");
    revalidatePath("/theories");
    revalidatePath("/library");
    revalidatePath("/news");
    revalidatePath("/profile/[member]", "page");

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
    return Response.json({ message: "Unable to vote ticket" }, { status: 500 });
  }
}
