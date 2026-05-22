import { BayMember } from "./bay-space-types";
import {
  SupabaseServerError,
  supabaseRequest,
} from "./supabase/server";
import {
  defaultCryptiCategory,
  isCryptiCategory,
} from "./crypti-categories";
import {
  CryptiTicker,
  CryptiVoteCounts,
  CryptiVoteValue,
  isCryptiVoteValue,
  normalizeCryptiSymbol,
} from "./crypti-types";

export { isCryptiVoteValue, normalizeCryptiSymbol };

type MemberRow = {
  id: string;
  member_number: number;
};

type CryptiTickerRow = {
  asset_type: string;
  category: string;
  chain_market: string;
  company: string;
  created_at: string;
  id: string;
  note: string;
  status: string;
  submitted_by_member_id: string | null;
  symbol: string;
  updated_at: string;
};

type CryptiVoteRow = {
  created_at: string;
  id: string;
  member_id: string;
  ticker_id: string;
  updated_at: string;
  vote_day_key: string;
  vote_value: CryptiVoteValue;
};

type NewTickerInput = {
  assetType?: string;
  category: string;
  chainMarket?: string;
  company?: string;
  note?: string;
  symbol: string;
};

const tickerSymbolPattern = /^[A-Z0-9.-]{1,12}$/;

export function isValidCryptiSymbol(symbol: string) {
  return tickerSymbolPattern.test(normalizeCryptiSymbol(symbol));
}

function getLosAngelesParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    month: "2-digit",
    timeZone: "America/Los_Angeles",
    year: "numeric",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    day: values.day,
    hour: values.hour,
    month: values.month,
    year: values.year,
  };
}

function formatDateKey(year: number, month: number, day: number) {
  return [
    year.toString().padStart(4, "0"),
    month.toString().padStart(2, "0"),
    day.toString().padStart(2, "0"),
  ].join("-");
}

export function getCryptiDayKey(date = new Date()) {
  const parts = getLosAngelesParts(date);

  if (parts.hour >= 12) {
    return formatDateKey(parts.year, parts.month, parts.day);
  }

  const previousDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day) - 24 * 60 * 60 * 1000,
  );

  return formatDateKey(
    previousDate.getUTCFullYear(),
    previousDate.getUTCMonth() + 1,
    previousDate.getUTCDate(),
  );
}

function emptyVoteCounts(): CryptiVoteCounts {
  return {
    downBad: 0,
    downTerrible: 0,
    score: 0,
    total: 0,
    upExcellent: 0,
    upGood: 0,
  };
}

function addVote(counts: CryptiVoteCounts, vote: CryptiVoteValue) {
  counts.total += 1;
  counts.score += vote;

  if (vote === -2) {
    counts.downTerrible += 1;
  } else if (vote === -1) {
    counts.downBad += 1;
  } else if (vote === 1) {
    counts.upGood += 1;
  } else {
    counts.upExcellent += 1;
  }
}

function publicTicker(
  ticker: CryptiTickerRow,
  today: CryptiVoteCounts,
  allTime: CryptiVoteCounts,
  userVote?: CryptiVoteValue,
): CryptiTicker {
  return {
    allTime,
    assetType: ticker.asset_type,
    category: ticker.category,
    chainMarket: ticker.chain_market,
    company: ticker.company,
    createdAt: ticker.created_at,
    id: ticker.id,
    note: ticker.note,
    symbol: ticker.symbol,
    today,
    userVote,
  };
}

function normalizeCategory(category: string) {
  return isCryptiCategory(category) ? category : defaultCryptiCategory;
}

async function getMemberRow(memberId: string) {
  const memberNumber = Number(memberId.replace(/\D/g, "").slice(0, 5));

  if (!Number.isFinite(memberNumber)) {
    return null;
  }

  const rows = await supabaseRequest<MemberRow[]>("members", {
    query: {
      deleted_at: "is.null",
      member_number: `eq.${memberNumber}`,
      select: "id,member_number",
    },
  });

  return rows[0] ?? null;
}

async function getTickerRow(symbol: string) {
  const rows = await supabaseRequest<CryptiTickerRow[]>("crypti_tickers", {
    query: {
      select: "*",
      status: "eq.active",
      symbol: `eq.${normalizeCryptiSymbol(symbol)}`,
    },
  });

  return rows[0] ?? null;
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof SupabaseServerError &&
    /duplicate key value|unique constraint|crypti_tickers_symbol_key/i.test(
      error.message,
    )
  );
}

export async function listCryptiTickers(member?: BayMember, search = "") {
  const symbolSearch = normalizeCryptiSymbol(search);
  const query: Record<string, string | number | boolean | undefined> = {
    order: "symbol.asc",
    select: "*",
    status: "eq.active",
  };

  if (symbolSearch) {
    query.symbol = `like.*${symbolSearch}*`;
  }

  const tickers = await supabaseRequest<CryptiTickerRow[]>("crypti_tickers", {
    query,
  });

  if (!tickers.length) {
    return [];
  }

  const tickerIds = tickers.map((ticker) => ticker.id);
  const todayKey = getCryptiDayKey();
  const votes = await supabaseRequest<CryptiVoteRow[]>("crypti_ticker_votes", {
    query: {
      order: "created_at.desc",
      select: "*",
      ticker_id: `in.(${tickerIds.join(",")})`,
    },
  });
  const memberRow = member ? await getMemberRow(member.member) : null;

  return tickers.map((ticker) => {
    const today = emptyVoteCounts();
    const allTime = emptyVoteCounts();
    let userVote: CryptiVoteValue | undefined;

    votes
      .filter((vote) => vote.ticker_id === ticker.id)
      .forEach((vote) => {
        addVote(allTime, vote.vote_value);

        if (vote.vote_day_key === todayKey) {
          addVote(today, vote.vote_value);

          if (memberRow?.id === vote.member_id) {
            userVote = vote.vote_value;
          }
        }
      });

    return publicTicker(ticker, today, allTime, userVote);
  });
}

export async function createCryptiTicker(
  member: BayMember,
  input: NewTickerInput,
) {
  const symbol = normalizeCryptiSymbol(input.symbol);

  if (!isValidCryptiSymbol(symbol)) {
    throw new Error("invalid ticker");
  }

  const existing = await getTickerRow(symbol);

  if (existing) {
    return publicTicker(existing, emptyVoteCounts(), emptyVoteCounts());
  }

  const memberRow = await getMemberRow(member.member);

  if (!memberRow) {
    throw new Error("member not found");
  }

  try {
    const rows = await supabaseRequest<CryptiTickerRow[]>("crypti_tickers", {
      body: {
        asset_type: input.assetType?.trim().slice(0, 40) ?? "",
        category: normalizeCategory(input.category),
        chain_market: input.chainMarket?.trim().slice(0, 80) ?? "",
        company: input.company?.trim().slice(0, 120) ?? "",
        note: input.note?.trim().slice(0, 240) ?? "",
        submitted_by_member_id: memberRow.id,
        symbol,
      },
      method: "POST",
      prefer: "return=representation",
      query: { select: "*" },
    });

    return publicTicker(rows[0], emptyVoteCounts(), emptyVoteCounts());
  } catch (error) {
    if (isUniqueViolation(error)) {
      const ticker = await getTickerRow(symbol);

      if (ticker) {
        return publicTicker(ticker, emptyVoteCounts(), emptyVoteCounts());
      }
    }

    throw error;
  }
}

export async function voteCryptiTicker(
  member: BayMember,
  symbol: string,
  voteValue: CryptiVoteValue,
) {
  const ticker = await getTickerRow(symbol);
  const memberRow = await getMemberRow(member.member);

  if (!ticker || !memberRow) {
    return null;
  }

  const todayKey = getCryptiDayKey();
  const existingVotes = await supabaseRequest<CryptiVoteRow[]>(
    "crypti_ticker_votes",
    {
      query: {
        member_id: `eq.${memberRow.id}`,
        select: "*",
        ticker_id: `eq.${ticker.id}`,
        vote_day_key: `eq.${todayKey}`,
      },
    },
  );
  const existingVote = existingVotes[0];

  if (existingVote) {
    await supabaseRequest<CryptiVoteRow[]>("crypti_ticker_votes", {
      body: {
        updated_at: new Date().toISOString(),
        vote_value: voteValue,
      },
      method: "PATCH",
      prefer: "return=minimal",
      query: { id: `eq.${existingVote.id}` },
    });
  } else {
    await supabaseRequest<CryptiVoteRow[]>("crypti_ticker_votes", {
      body: {
        member_id: memberRow.id,
        ticker_id: ticker.id,
        vote_day_key: todayKey,
        vote_value: voteValue,
      },
      method: "POST",
      prefer: "return=minimal",
    });
  }

  return (await listCryptiTickers(member, ticker.symbol))[0] ?? null;
}
