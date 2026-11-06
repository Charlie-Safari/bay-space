import { revalidatePath } from "next/cache";
import { getStorageErrorMessage } from "../../../../../lib/bay-space-db";
import {
  type BayPollWagerCurrency,
  votePoll,
} from "../../../../../lib/bay-space-polls";
import { getCurrentMember } from "../../../../../lib/bay-space-session";

type PollVoteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: PollVoteContext) {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return Response.json({ message: "Sign in to vote" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      optionId?: unknown;
      wagerAmount?: unknown;
      wagerCurrency?: unknown;
    };
    const optionId = typeof body.optionId === "string" ? body.optionId : "";
    const wagerCurrency = ["none", "coins", "token"].includes(
      String(body.wagerCurrency),
    )
      ? (body.wagerCurrency as BayPollWagerCurrency)
      : "none";
    const wagerAmount = Math.floor(Number(body.wagerAmount) || 0);

    if (!optionId) {
      return Response.json({ message: "Choose an answer" }, { status: 400 });
    }

    await votePoll(member, id, optionId, wagerCurrency, wagerAmount);
    revalidatePath("/polls");
    revalidatePath(`/profile/${member.member}`);
    return Response.json({ ok: true });
  } catch (error) {
    const message = getStorageErrorMessage(error) ?? "Unable to submit vote";
    console.error(error);
    return Response.json({ message }, { status: 400 });
  }
}
