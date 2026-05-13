"use client";

import type { BayPost, BayPostCategory } from "../../lib/bay-space-types";

export type { BayPost, BayPostCategory };

export const postStoreEvent = "bay-space-posts";

export function normalizeShelfLabel(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function getBayPosts() {
  const response = await fetch("/api/posts", { cache: "no-store" });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { posts?: BayPost[] };

  return data.posts ?? [];
}

export async function getBayPostsByCategory(category: BayPostCategory) {
  const response = await fetch(`/api/posts?category=${category}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { posts?: BayPost[] };

  return data.posts ?? [];
}

export async function saveBayPost(
  post: Omit<BayPost, "id" | "createdAt" | "dateKey">,
) {
  const response = await fetch("/api/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(post),
  });

  if (!response.ok) {
    throw new Error("Unable to save post");
  }

  const data = (await response.json()) as { post: BayPost };

  window.dispatchEvent(new Event(postStoreEvent));

  return data.post;
}

export async function deleteBayPost(postId: string, author: string) {
  const response = await fetch(
    `/api/posts/${encodeURIComponent(postId)}?author=${encodeURIComponent(
      author,
    )}`,
    { method: "DELETE" },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error("Unable to delete post");
  }

  window.dispatchEvent(new Event(postStoreEvent));
}
