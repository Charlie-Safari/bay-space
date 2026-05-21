import {
  getStorageErrorMessage,
  incrementPostTicketVoteCount,
} from "../../../../../lib/bay-space-db";
import { revalidatePath } from "next/cache";

type TicketVoteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: TicketVoteContext) {
  try {
    void request;
    const { id } = await context.params;
    const result = await incrementPostTicketVoteCount(id);

    if (!result) {
      return Response.json({ message: "Post not found" }, { status: 404 });
    }

    revalidatePath("/daily-food");
    revalidatePath("/news");

    return Response.json({
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
