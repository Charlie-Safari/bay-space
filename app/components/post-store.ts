"use client";

import type { BayPost, BayPostCategory } from "../../lib/bay-space-types";

export type { BayPost, BayPostCategory };

export const postStoreEvent = "bay-space-posts";

function notifyPostStoreChange() {
  window.dispatchEvent(new Event(postStoreEvent));

  try {
    window.localStorage.setItem(postStoreEvent, Date.now().toString());
  } catch {
    // Storage may be unavailable in private contexts; same-page listeners still run.
  }
}

export function normalizeShelfLabel(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
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

  notifyPostStoreChange();

  return data.post;
}

export async function deleteBayPost(postId: string) {
  const response = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 404) {
    throw new Error("Unable to delete post");
  }

  notifyPostStoreChange();
}
