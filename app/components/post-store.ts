"use client";

export type BayPostCategory =
  | "top-story"
  | "daily-food"
  | "theory"
  | "library-submission";

export type BayPost = {
  id: string;
  category: BayPostCategory;
  title: string;
  body: string;
  createdAt: string;
  dateKey: string;
  anonymous: boolean;
  incognito?: boolean;
  author: string;
  shelfLabel?: string;
  shelfCode?: string;
  meta?: Record<string, string | string[]>;
};

const postStoreKey = "bay-space-posts-v1";
export const postStoreEvent = "bay-space-posts";

export function normalizeShelfLabel(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getBayPosts() {
  if (typeof window === "undefined") {
    return [];
  }

  const savedPosts = window.localStorage.getItem(postStoreKey);

  if (!savedPosts) {
    return [];
  }

  try {
    return JSON.parse(savedPosts) as BayPost[];
  } catch {
    return [];
  }
}

export function getBayPostsByCategory(category: BayPostCategory) {
  return getBayPosts().filter((post) => post.category === category);
}

export function saveBayPost(post: Omit<BayPost, "id" | "createdAt" | "dateKey">) {
  const createdAt = new Date();
  const nextPost: BayPost = {
    ...post,
    incognito: post.incognito ?? false,
    id: `${createdAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: createdAt.toISOString(),
    dateKey: getDateKey(createdAt),
  };
  const nextPosts = [nextPost, ...getBayPosts()];

  window.localStorage.setItem(postStoreKey, JSON.stringify(nextPosts));
  window.dispatchEvent(new Event(postStoreEvent));

  return nextPost;
}

export function deleteBayPost(postId: string) {
  const nextPosts = getBayPosts().filter((post) => post.id !== postId);

  window.localStorage.setItem(postStoreKey, JSON.stringify(nextPosts));
  window.dispatchEvent(new Event(postStoreEvent));
}
