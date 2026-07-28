import {
  isMissingRugWarningVoteTable,
  toggleCryptiTickerRugWarningVote,
} from "../../../../lib/crypti-db";
import { getCurrentMember } from "../../../../lib/bay-space-session";
import { getStorageErrorMessage } from "../../../../lib/bay-space-db";
import { isCrypti } from "../../../../lib/bay-space-roles";

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

    if (!member || !isCrypti(member)) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      symbol?: string;
    };
    const ticker = await toggleCryptiTickerRugWarningVote(
      member,
      body.symbol ?? "",
    );

    if (!ticker) {
      return Response.json({ message: "Ticker not found" }, { status: 404 });
    }

    return Response.json({ ticker });
  } catch (error) {
    if (isMissingRugWarningVoteTable(error)) {
      return Response.json(
        { message: "Rug City warning votes need setup" },
        { status: 503 },
      );
    }

    return cryptiErrorResponse(error, "Unable to update Rug City warning vote");
  }
}
