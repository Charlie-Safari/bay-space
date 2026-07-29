import type { BayPost, BayPostCategory } from "./bay-space-types";

export const postVisitPointTenths = 10;
export const postFavoritePointTenths = 100;
export const postTicketPointTenths = 500;
export const truthVoteLowPointTenths = 10;
export const truthVoteHighPointTenths = 20;
export const articleReadPointValue = 5;
export const profileVisitPointValue = 1;

export const baySpaceProfilePostPointValues = {
  "daily-food": 10,
  theory: 1,
  "library-submission": 5,
} as const satisfies Partial<Record<BayPostCategory, number>>;

export const cryptiProfilePostPointValues = {
  R: 10,
  Q: 1,
  S: 5,
} as const;

export function getPositiveInteger(value: unknown) {
  const count = Number(value);

  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

export function getPostVisitCount(post: Pick<BayPost, "meta"> | null) {
  return getPositiveInteger(post?.meta?.postVisits);
}

export function getPostShareLinkClickCount(
  post: Pick<BayPost, "meta"> | null,
) {
  return getPositiveInteger(post?.meta?.shareLinkClicks);
}

export function getPostFavoriteCount(
  postId: string,
  favoriteCounts: Record<string, number>,
) {
  return getPositiveInteger(favoriteCounts[postId]);
}

export function getPostTicketCount(post: Pick<BayPost, "meta"> | null) {
  return getPositiveInteger(
    post?.meta?.cryptiTicketVotes ?? post?.meta?.ticketVotes,
  );
}

export function getTruthVotePointValue(score: number) {
  if (score >= 10 && score <= 11) {
    return 2;
  }

  if (score >= 2 && score <= 9) {
    return 1;
  }

  return 0;
}

export function getPostTruthPointTenths(post: Pick<BayPost, "meta"> | null) {
  return getPositiveInteger(post?.meta?.truthPointTenths);
}

export function getBaySpacePostTicketCount(post: Pick<BayPost, "meta"> | null) {
  return getPositiveInteger(post?.meta?.ticketVotes);
}

export function getPostPointTenths(
  post: Pick<BayPost, "id" | "meta">,
  favoriteCounts: Record<string, number>,
) {
  return (
    getPostVisitCount(post) * postVisitPointTenths +
    getPostFavoriteCount(post.id, favoriteCounts) * postFavoritePointTenths +
    getPostTicketCount(post) * postTicketPointTenths +
    getPostTruthPointTenths(post)
  );
}

export function getBaySpacePostPointTenths(
  post: Pick<BayPost, "id" | "meta">,
  favoriteCounts: Record<string, number>,
) {
  return (
    getPostVisitCount(post) * postVisitPointTenths +
    getPostFavoriteCount(post.id, favoriteCounts) * postFavoritePointTenths +
    getBaySpacePostTicketCount(post) * postTicketPointTenths +
    getPostTruthPointTenths(post)
  );
}

export function formatPointTenths(pointTenths: number) {
  const sign = pointTenths < 0 ? "-" : "";
  const absoluteTenths = Math.abs(pointTenths);
  const wholePoints = Math.floor(absoluteTenths / 10);
  const tenth = absoluteTenths % 10;

  return `${sign}${wholePoints}${tenth ? `.${tenth}` : ""}`;
}

export function getCryptiPostSourceMode(post: Pick<BayPost, "meta">) {
  const sourceMode = post.meta?.cryptiSourceMode;

  return sourceMode === "R" || sourceMode === "Q" || sourceMode === "S"
    ? sourceMode
    : null;
}

export function getCryptiProfilePostBasePoints(post: Pick<BayPost, "meta">) {
  const sourceMode = getCryptiPostSourceMode(post);

  return sourceMode ? cryptiProfilePostPointValues[sourceMode] : 0;
}

export function isCryptiPost(post: Pick<BayPost, "meta">) {
  return post.meta?.cryptiPost === "true";
}

export function isBaySpaceProfileScorePost(
  post: Pick<BayPost, "category" | "meta">,
) {
  return (
    !isCryptiPost(post) &&
    (post.category === "daily-food" ||
      post.category === "theory" ||
      post.category === "library-submission")
  );
}

export function getBaySpaceProfilePostBasePoints(
  post: Pick<BayPost, "category" | "meta">,
) {
  if (!isBaySpaceProfileScorePost(post)) {
    return 0;
  }

  if (post.category === "daily-food") {
    return baySpaceProfilePostPointValues["daily-food"];
  }

  if (post.category === "theory") {
    return baySpaceProfilePostPointValues.theory;
  }

  return baySpaceProfilePostPointValues["library-submission"];
}

export function getBaySpaceProfileScoreTenths(
  posts: Array<Pick<BayPost, "category" | "id" | "meta">>,
  favoriteCounts: Record<string, number>,
  profileVisits = 0,
) {
  return (
    getPositiveInteger(profileVisits) * postVisitPointTenths +
    posts.reduce(
      (total, post) =>
        total +
        getBaySpaceProfilePostBasePoints(post) * 10 +
        getBaySpacePostPointTenths(post, favoriteCounts),
      0,
    )
  );
}
