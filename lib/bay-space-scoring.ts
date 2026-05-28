import { BayPost } from "./bay-space-types";

export const postVisitPointTenths = 1;
export const postFavoritePointTenths = 100;
export const postTicketPointTenths = 500;

export const profilePostPointValues = {
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

export function getPostPointTenths(
  post: Pick<BayPost, "id" | "meta">,
  favoriteCounts: Record<string, number>,
) {
  return (
    getPostVisitCount(post) * postVisitPointTenths +
    getPostFavoriteCount(post.id, favoriteCounts) * postFavoritePointTenths +
    getPostTicketCount(post) * postTicketPointTenths
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

  return sourceMode ? profilePostPointValues[sourceMode] : 0;
}
