import {
  createCryptiTicker,
  deleteCryptiTicker,
  DuplicateCryptiTickerError,
  getCryptiTicker,
  listCryptiTickers,
} from "../../../../lib/crypti-db";
import { getCurrentMember } from "../../../../lib/bay-space-session";
import { getStorageErrorMessage } from "../../../../lib/bay-space-db";
import { canAccessCrypti } from "../../../../lib/bay-space-roles";

function cryptiErrorResponse(error: unknown, fallbackMessage: string) {
  const storageMessage = getStorageErrorMessage(error);

  if (storageMessage) {
    console.error(storageMessage);
    return Response.json({ message: storageMessage }, { status: 503 });
  }

  console.error(error);
  return Response.json({ message: fallbackMessage }, { status: 500 });
}

async function requireCryptiMember() {
  const member = await getCurrentMember();

  return member && canAccessCrypti(member) ? member : null;
}

export async function GET(request: Request) {
  try {
    const member = await requireCryptiMember();

    if (!member) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    return Response.json({
      tickers: await listCryptiTickers(member, searchParams.get("search") ?? ""),
    });
  } catch (error) {
    return cryptiErrorResponse(error, "Unable to load Crypti tickers");
  }
}

export async function POST(request: Request) {
  let member: Awaited<ReturnType<typeof requireCryptiMember>> = null;

  try {
    member = await requireCryptiMember();

    if (!member) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      assetType?: string;
      category?: string;
      chainMarket?: string;
      company?: string;
      note?: string;
      symbol?: string;
    };

    return Response.json(
      {
        ticker: await createCryptiTicker(member, {
          assetType: body.assetType,
          category: body.category ?? "",
          chainMarket: body.chainMarket,
          company: body.company,
          note: body.note,
          symbol: body.symbol ?? "",
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DuplicateCryptiTickerError) {
      return Response.json(
        {
          message: error.message,
          ticker: member
            ? await getCryptiTicker(member, error.symbol).catch(() => null)
            : null,
        },
        { status: 409 },
      );
    }

    return cryptiErrorResponse(error, "Unable to save Crypti ticker");
  }
}

export async function DELETE(request: Request) {
  try {
    const member = await requireCryptiMember();

    if (!member) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      symbol?: string;
    };
    const deleted = await deleteCryptiTicker(member, body.symbol ?? "");

    if (!deleted) {
      return Response.json({ message: "Ticker not found" }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return cryptiErrorResponse(error, "Unable to delete Crypti ticker");
  }
}
