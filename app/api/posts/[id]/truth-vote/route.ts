import { revalidatePath } from "next/cache";
import {
  getPostTruthVoteSummary,
  getStorageErrorMessage,
  togglePostTruthVote,
} from "../../../../../lib/bay-space-db";
import { getCurrentMember } from "../../../../../lib/bay-space-session";

type TruthVoteContext = {
  params: Promise<{ id: string }>;
};

function truthVoteErrorResponse(error: unknown) {
  const storageMessage = getStorageErrorMessage(error);

  if (storageMessage) {
    console.error(storageMessage);
    return Response.json({ message: storageMessage }, { status: 503 });
  }

  console.error(error);
  return Response.json(
    { message: "Unable to update truth vote" },
    { status: 500 },
  );
}

export async function GET(_request: Request, context: TruthVoteContext) {
  try {
    const { id } = await context.params;
    const member = await getCurrentMember();
    const summary = await getPostTruthVoteSummary(id, member?.member);

    if (!summary) {
      return Response.json({ message: "Post not found" }, { status: 404 });
    }

    return Response.json({ summary });
  } catch (error) {
    return truthVoteErrorResponse(error);
  }
}

export async function POST(request: Request, context: TruthVoteContext) {
  try {
    const { id } = await context.params;
    const member = await getCurrentMember();

    if (!member) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { score?: unknown };
    const score = Number(body.score);

    if (!Number.isFinite(score) || score < 0 || score > 11) {
      return Response.json({ message: "Invalid truth score" }, { status: 400 });
    }

    const result = await togglePostTruthVote(id, member.member, score);

    if (!result) {
      return Response.json({ message: "Post not found" }, { status: 404 });
    }

    revalidatePath("/daily-food");
    revalidatePath("/facts-on-news");
    revalidatePath("/theories");
    revalidatePath("/profile/[member]", "page");

    return Response.json(result);
  } catch (error) {
    return truthVoteErrorResponse(error);
  }
}
