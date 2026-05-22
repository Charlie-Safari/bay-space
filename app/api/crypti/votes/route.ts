import {
  voteCryptiTicker,
} from "../../../../lib/crypti-db";
import { getCurrentMember } from "../../../../lib/bay-space-session";
import { getStorageErrorMessage } from "../../../../lib/bay-space-db";
import { isCrypti } from "../../../../lib/bay-space-roles";
import { isCryptiVoteValue } from "../../../../lib/crypti-types";

function cryptiErrorResponse(error: unknown, fallbackMessage: string) {
  const storageMessage = getStorageErrorMessage(error);

  if (storageMessage) {
    console.error(storageMessage);
    return Response.json({ message: storageMessage }, { status: 503 });
  }

  console.error(error);
  return Response.json({ message: fallbackMessage }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const member = await getCurrentMember();

    if (!member || !isCrypti(member.roles)) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      symbol?: string;
      voteValue?: unknown;
    };

    if (!isCryptiVoteValue(body.voteValue)) {
      return Response.json({ message: "Invalid vote" }, { status: 400 });
    }

    const ticker = await voteCryptiTicker(
      member,
      body.symbol ?? "",
      body.voteValue,
    );

    if (!ticker) {
      return Response.json({ message: "Ticker not found" }, { status: 404 });
    }

    return Response.json({ ticker });
  } catch (error) {
    return cryptiErrorResponse(error, "Unable to cast Crypti vote");
  }
}
