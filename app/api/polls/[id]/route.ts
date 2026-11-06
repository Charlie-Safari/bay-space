import { revalidatePath } from "next/cache";
import { getStorageErrorMessage } from "../../../../lib/bay-space-db";
import { cancelPoll, editPoll } from "../../../../lib/bay-space-polls";
import { getCurrentMember } from "../../../../lib/bay-space-session";

type PollContext = { params: Promise<{ id: string }> };

function pollError(error: unknown, fallback: string) {
  const message = getStorageErrorMessage(error) ?? fallback;
  console.error(error);
  return Response.json({ message }, { status: 400 });
}

export async function PATCH(request: Request, context: PollContext) {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return Response.json({ message: "Sign in required" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      action?: string;
      options?: unknown;
      question?: unknown;
    };

    if (body.action === "cancel") {
      await cancelPoll(member, id);
    } else if (body.action === "edit") {
      const question = typeof body.question === "string" ? body.question.trim() : "";
      const options = Array.isArray(body.options)
        ? body.options
            .filter((option): option is string => typeof option === "string")
            .map((option) => option.trim())
        : [];

      if (!question || question.length > 150 || options.length < 2 || options.length > 3) {
        return Response.json({ message: "Invalid poll" }, { status: 400 });
      }
      await editPoll(member, id, question, options);
    } else {
      return Response.json({ message: "Invalid poll action" }, { status: 400 });
    }

    revalidatePath("/polls");
    revalidatePath(`/profile/${member.member}`);
    return Response.json({ ok: true });
  } catch (error) {
    return pollError(error, "Unable to update poll");
  }
}
