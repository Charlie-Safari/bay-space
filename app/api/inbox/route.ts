import {
  createDirectMessage,
  getDirectConversation,
  getStorageErrorMessage,
  listDirectConversations,
} from "../../../lib/bay-space-db";
import { getCurrentMember } from "../../../lib/bay-space-session";

function inboxErrorResponse(error: unknown) {
  const storageMessage = getStorageErrorMessage(error);

  if (storageMessage) {
    console.error(storageMessage);
    return Response.json({ message: storageMessage }, { status: 503 });
  }

  console.error(error);
  return Response.json({ message: "Unable to load inbox" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const otherMember = searchParams.get("member")?.trim();

    if (otherMember) {
      const conversation = await getDirectConversation(
        member.member,
        otherMember,
      );

      return conversation
        ? Response.json({ conversation })
        : Response.json({ message: "Member not found" }, { status: 404 });
    }

    return Response.json({
      conversations: await listDirectConversations(member.member),
    });
  } catch (error) {
    return inboxErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      body?: string;
      recipientMember?: string;
    };
    const messageBody = body.body?.trim() ?? "";
    const recipientMember = body.recipientMember?.trim() ?? "";

    if (!recipientMember) {
      return Response.json({ message: "Recipient required" }, { status: 400 });
    }

    if (!messageBody) {
      return Response.json({ message: "Message required" }, { status: 400 });
    }

    const result = await createDirectMessage(
      member.member,
      recipientMember,
      messageBody,
    );

    if (!result.recipient) {
      return Response.json({ message: "Recipient not found" }, { status: 404 });
    }

    if (result.blocked) {
      return Response.json(
        {
          hasBlockedMe: result.hasBlockedMe,
          isBlockedByMe: result.isBlockedByMe,
          message: "Messaging blocked",
          recipient: result.recipient,
        },
        { status: 403 },
      );
    }

    return Response.json(
      {
        message: result.message,
        recipient: result.recipient,
      },
      { status: 201 },
    );
  } catch (error) {
    return inboxErrorResponse(error);
  }
}
