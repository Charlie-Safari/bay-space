import { isAdmin } from "./bay-space-roles";
import type { BayMember } from "./bay-space-types";
import { supabaseRequest } from "./supabase/server";

export type BayPollStatus = "staging" | "open" | "settled" | "cancelled";
export type BayPollWagerCurrency = "none" | "coins" | "token";

export type BayPollOption = {
  id: string;
  label: string;
  position: number;
  voteCount: number;
  percentage: number;
};

export type BayPoll = {
  id: string;
  authorMember: string;
  authorName: string;
  question: string;
  status: BayPollStatus;
  options: BayPollOption[];
  opensAt: string;
  closesAt: string;
  createdAt: string;
  winningOptionId: string | null;
  totalVotes: number;
  viewerOptionId: string | null;
  viewerWagerCurrency: BayPollWagerCurrency;
  viewerWagerAmount: number;
  canEdit: boolean;
  canCancel: boolean;
};

export type BayPollStats = {
  authored: number;
  currentStreak: number;
  netPoints: number;
  pointsLost: number;
  pointsWon: number;
  refunded: number;
  voted: number;
  won: number;
  lost: number;
  accuracy: number;
};

type PollRow = {
  author_member_id: string;
  author_member_number: number;
  cancelled_at: string | null;
  closes_at: string;
  created_at: string;
  id: string;
  opens_at: string;
  question: string;
  status: BayPollStatus;
  updated_at: string;
  winning_option_id: string | null;
};

type PollOptionRow = {
  id: string;
  label: string;
  poll_id: string;
  position: number;
};

type PollVoteRow = {
  created_at: string;
  member_id: string;
  member_number: number;
  option_id: string;
  outcome: "pending" | "won" | "lost" | "refunded";
  payout_points: number;
  poll_id: string;
  settled_at: string | null;
  wager_amount: number;
  wager_currency: BayPollWagerCurrency;
  wager_point_value: number;
};

type PollMemberRow = {
  id: string;
  member_number: number;
  name: string;
};

function formatMemberNumber(memberNumber: number) {
  return String(memberNumber).padStart(5, "0");
}

function inFilter(values: string[]) {
  return `in.(${values.join(",")})`;
}

export function canAuthorPolls(member: BayMember | null | undefined) {
  return Boolean(member?.gateKeys.includes("impossible-badge"));
}

export async function settleExpiredPolls() {
  await supabaseRequest<number>("rpc/settle_expired_bay_polls", {
    body: {},
    method: "POST",
  });
}

async function getPollMember(memberNumber: string | number) {
  const normalizedMemberNumber = Number(String(memberNumber).replace(/\D/g, ""));

  if (!Number.isFinite(normalizedMemberNumber)) {
    return null;
  }

  const rows = await supabaseRequest<PollMemberRow[]>("members", {
    query: {
      deleted_at: "is.null",
      limit: 1,
      member_number: `eq.${normalizedMemberNumber}`,
      select: "id,member_number,name",
    },
  });

  return rows[0] ?? null;
}

export async function listPolls(viewer?: BayMember | null) {
  await settleExpiredPolls();
  const polls = await supabaseRequest<PollRow[]>("polls", {
    query: { order: "created_at.desc", select: "*" },
  });

  if (!polls.length) {
    return [] as BayPoll[];
  }

  const pollIds = polls.map((poll) => poll.id);
  const authorIds = Array.from(new Set(polls.map((poll) => poll.author_member_id)));
  const [options, votes, authors] = await Promise.all([
    supabaseRequest<PollOptionRow[]>("poll_options", {
      query: { order: "position.asc", poll_id: inFilter(pollIds), select: "*" },
    }),
    supabaseRequest<PollVoteRow[]>("poll_votes", {
      query: { poll_id: inFilter(pollIds), select: "*" },
    }),
    supabaseRequest<PollMemberRow[]>("members", {
      query: { id: inFilter(authorIds), select: "id,member_number,name" },
    }),
  ]);
  const viewerNumber = viewer ? Number(viewer.member) : null;
  const now = Date.now();

  return polls.map((poll) => {
    const pollVotes = votes.filter((vote) => vote.poll_id === poll.id);
    const viewerVote = pollVotes.find(
      (vote) => viewerNumber !== null && vote.member_number === viewerNumber,
    );
    const totalVotes = pollVotes.length;
    const author = authors.find((candidate) => candidate.id === poll.author_member_id);
    const isOwner = viewerNumber === poll.author_member_number;
    const isWithinEditWindow = now < new Date(poll.opens_at).getTime();

    return {
      id: poll.id,
      authorMember: formatMemberNumber(poll.author_member_number),
      authorName: author?.name ?? "explorer",
      question: poll.question,
      status: poll.status,
      options: options
        .filter((option) => option.poll_id === poll.id)
        .map((option) => {
          const voteCount = pollVotes.filter(
            (vote) => vote.option_id === option.id,
          ).length;

          return {
            id: option.id,
            label: option.label,
            position: option.position,
            voteCount,
            percentage: totalVotes
              ? Math.round((voteCount / totalVotes) * 1000) / 10
              : 0,
          };
        }),
      opensAt: poll.opens_at,
      closesAt: poll.closes_at,
      createdAt: poll.created_at,
      winningOptionId: poll.winning_option_id,
      totalVotes,
      viewerOptionId: viewerVote?.option_id ?? null,
      viewerWagerCurrency: viewerVote?.wager_currency ?? "none",
      viewerWagerAmount: viewerVote?.wager_amount ?? 0,
      canEdit: Boolean(isOwner && poll.status === "staging" && isWithinEditWindow),
      canCancel: Boolean(
        (isOwner && poll.status === "staging" && isWithinEditWindow) ||
          (viewer && isAdmin(viewer) && !["settled", "cancelled"].includes(poll.status)),
      ),
    } satisfies BayPoll;
  });
}

export async function createPoll(
  member: BayMember,
  question: string,
  options: string[],
) {
  return supabaseRequest<string>("rpc/create_bay_poll", {
    body: {
      p_member_number: Number(member.member),
      p_options: options,
      p_question: question,
    },
    method: "POST",
  });
}

export async function editPoll(
  member: BayMember,
  pollId: string,
  question: string,
  options: string[],
) {
  return supabaseRequest<boolean>("rpc/edit_bay_poll", {
    body: {
      p_member_number: Number(member.member),
      p_options: options,
      p_poll_id: pollId,
      p_question: question,
    },
    method: "POST",
  });
}

export async function cancelPoll(member: BayMember, pollId: string) {
  return supabaseRequest<boolean>("rpc/cancel_bay_poll", {
    body: {
      p_admin: isAdmin(member),
      p_member_number: Number(member.member),
      p_poll_id: pollId,
    },
    method: "POST",
  });
}

export async function votePoll(
  member: BayMember,
  pollId: string,
  optionId: string,
  wagerCurrency: BayPollWagerCurrency,
  wagerAmount: number,
) {
  return supabaseRequest<boolean>("rpc/vote_bay_poll", {
    body: {
      p_member_number: Number(member.member),
      p_option_id: optionId,
      p_poll_id: pollId,
      p_wager_amount: wagerAmount,
      p_wager_currency: wagerCurrency,
    },
    method: "POST",
  });
}

export async function getPollStats(memberNumber: string): Promise<BayPollStats> {
  await settleExpiredPolls();
  const member = await getPollMember(memberNumber);

  if (!member) {
    return {
      authored: 0,
      currentStreak: 0,
      netPoints: 0,
      pointsLost: 0,
      pointsWon: 0,
      refunded: 0,
      voted: 0,
      won: 0,
      lost: 0,
      accuracy: 0,
    };
  }

  const [votes, authoredPolls] = await Promise.all([
    supabaseRequest<PollVoteRow[]>("poll_votes", {
      query: {
        member_id: `eq.${member.id}`,
        order: "settled_at.desc.nullslast,created_at.desc",
        select: "*",
      },
    }),
    supabaseRequest<Array<{ id: string }>>("polls", {
      query: { author_member_id: `eq.${member.id}`, select: "id" },
    }),
  ]);
  const finished = votes.filter((vote) => vote.outcome !== "pending");
  const won = finished.filter((vote) => vote.outcome === "won").length;
  const lost = finished.filter((vote) => vote.outcome === "lost").length;
  const refunded = finished.filter((vote) => vote.outcome === "refunded").length;
  const pointsWon = finished.reduce(
    (total, vote) =>
      total +
      (vote.outcome === "won"
        ? Math.max(0, vote.payout_points - vote.wager_point_value)
        : 0),
    0,
  );
  const pointsLost = finished.reduce(
    (total, vote) =>
      total + (vote.outcome === "lost" ? vote.wager_point_value : 0),
    0,
  );
  let currentStreak = 0;

  for (const vote of finished) {
    if (vote.outcome !== "won") {
      break;
    }
    currentStreak += 1;
  }

  return {
    authored: authoredPolls.length,
    currentStreak,
    netPoints: pointsWon - pointsLost,
    pointsLost,
    pointsWon,
    refunded,
    voted: votes.length,
    won,
    lost,
    accuracy: won + lost ? Math.round((won / (won + lost)) * 1000) / 10 : 0,
  };
}
