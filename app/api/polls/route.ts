import { revalidatePath } from "next/cache";
import { getStorageErrorMessage } from "../../../lib/bay-space-db";
import {
  canAuthorPolls,
  createPoll,
  listPolls,
} from "../../../lib/bay-space-polls";
import { getCurrentMember } from "../../../lib/bay-space-session";

function pollError(error: unknown, fallback: string) {
  const message = getStorageErrorMessage(error) ?? fallback;
  console.error(error);
  return Response.json({ message }, { status: 400 });
}

export async function GET() {
  try {
    const member = await getCurrentMember();
    const polls = await listPolls(member);
    const activeCount = polls.filter((poll) =>
      ["staging", "open"].includes(poll.status),
    ).length;

    return Response.json({
      activeCount,
      availableSlots: Math.max(0, 16 - activeCount),
      canAuthor: canAuthorPolls(member),
      isSignedIn: Boolean(member),
      polls,
      viewer: member
        ? {
            bayoCoins: member.bayoCoins,
            bayoTokens: member.bayoTokens,
            member: member.member,
          }
        : null,
    });
  } catch (error) {
    return pollError(error, "Unable to load polls");
  }
}

export async function POST(request: Request) {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return Response.json({ message: "Sign in required" }, { status: 401 });
    }

    if (!canAuthorPolls(member)) {
      return Response.json({ message: "Poll authorship locked" }, { status: 403 });
    }

    const body = (await request.json()) as {
      options?: unknown;
      question?: unknown;
    };
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const options = Array.isArray(body.options)
      ? body.options
          .filter((option): option is string => typeof option === "string")
          .map((option) => option.trim())
      : [];

    if (!question || question.length > 150 || options.length < 2 || options.length > 3) {
      return Response.json({ message: "Use one question and two or three answers" }, { status: 400 });
    }

    const id = await createPoll(member, question, options);
    revalidatePath("/polls");
    revalidatePath(`/profile/${member.member}`);
    return Response.json({ id });
  } catch (error) {
    return pollError(error, "Unable to create poll");
  }
}
