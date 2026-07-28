import {
  addMemberOwnedCryptiTickerSymbol,
  getStorageErrorMessage,
  listMemberOwnedCryptiTickerSymbols,
  removeMemberOwnedCryptiTickerSymbol,
} from "../../../../lib/bay-space-db";
import { getCurrentMember } from "../../../../lib/bay-space-session";
import { isCrypti } from "../../../../lib/bay-space-roles";
import { normalizeCryptiSymbol } from "../../../../lib/crypti-db";

function ownedTickersErrorResponse(error: unknown) {
  const storageMessage = getStorageErrorMessage(error);

  if (storageMessage) {
    console.error(storageMessage);
    return Response.json({ message: storageMessage }, { status: 503 });
  }

  console.error(error);
  return Response.json(
    { message: "Unable to update owned tickers" },
    { status: 500 },
  );
}

async function requireCryptiMember() {
  const member = await getCurrentMember();

  return member && isCrypti(member) ? member : null;
}

export async function GET() {
  try {
    const member = await requireCryptiMember();

    if (!member) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    return Response.json({
      symbols: await listMemberOwnedCryptiTickerSymbols(member.member),
    });
  } catch (error) {
    return ownedTickersErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const member = await requireCryptiMember();

    if (!member) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { symbol?: string };
    const symbol = normalizeCryptiSymbol(body.symbol ?? "");

    if (!symbol) {
      return Response.json({ message: "Ticker required" }, { status: 400 });
    }

    return Response.json({
      symbols: await addMemberOwnedCryptiTickerSymbol(member.member, symbol),
    });
  } catch (error) {
    return ownedTickersErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const member = await requireCryptiMember();

    if (!member) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { symbol?: string };
    const symbol = normalizeCryptiSymbol(body.symbol ?? "");

    if (!symbol) {
      return Response.json({ message: "Ticker required" }, { status: 400 });
    }

    return Response.json({
      symbols: await removeMemberOwnedCryptiTickerSymbol(member.member, symbol),
    });
  } catch (error) {
    return ownedTickersErrorResponse(error);
  }
}
