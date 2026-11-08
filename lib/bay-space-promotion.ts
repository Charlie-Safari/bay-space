import { getNextBayPointRank } from "./bay-space-ranks";

export const participationLabels = {
  conspiracyReads: "Conspiracy articles opened",
  currentEventsReads: "Current Events articles opened",
  comments: "Comments left",
  conspiracyComments: "Conspiracy comments",
  currentEventsComments: "Current Events comments",
  shares: "Post links shared",
  favorites: "Favorite diamonds saved",
  stamps: "Stamps collected",
  quizzes: "Weekly quizzes completed",
  polls: "Polls participated in",
  conspiracyRatings: "Conspiracy posts rated",
  currentEventsRatings: "Current Events posts rated",
};

type Activity = keyof typeof participationLabels;
export type RankParticipation = Record<Activity, number>;
type Requirements = Partial<RankParticipation>;

function higherRankRequirements(
  reads: number,
  comments: number,
  shares: number,
  quizzes: number,
  polls: number,
  ratings: number,
): Requirements {
  return {
    conspiracyReads: reads,
    currentEventsReads: reads,
    conspiracyComments: comments,
    currentEventsComments: comments,
    shares,
    quizzes,
    polls,
    conspiracyRatings: ratings,
    currentEventsRatings: ratings,
  };
}

const participationRequirements = {
  reader: {},
  poster: {
    conspiracyReads: 10,
    currentEventsReads: 1,
    shares: 1,
    favorites: 1,
    stamps: 1,
    conspiracyRatings: 1,
    currentEventsRatings: 1,
  },
  "reader-ii": higherRankRequirements(100, 10, 5, 2, 5, 10),
  "poster-ii": higherRankRequirements(150, 15, 8, 3, 8, 15),
  "poster-iii": higherRankRequirements(175, 18, 10, 4, 10, 18),
  graduation: {},
} satisfies Record<string, Requirements>;

export function getParticipationChecklist(
  rank: keyof typeof participationRequirements,
  participation?: RankParticipation,
) {
  const requirements: Requirements = participationRequirements[rank];
  return (Object.keys(requirements) as Activity[]).map((activity) => ({
    activity,
    label: participationLabels[activity],
    current: participation?.[activity] ?? 0,
    required: requirements[activity]!,
  }));
}

export function getEligibleBayRank(
  rank: string | null,
  lifetimePoints: number,
  participation: RankParticipation,
) {
  let next = getNextBayPointRank(rank);
  let earned = null;

  while (
    next &&
    lifetimePoints >= next.minLifetimePoints &&
    getParticipationChecklist(next.id, participation).every(
      ({ current, required }) => current >= required,
    )
  ) {
    earned = next;
    next = getNextBayPointRank(next.id);
  }

  return earned;
}
