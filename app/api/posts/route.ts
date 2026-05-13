import { createPost, listPosts } from "../../../lib/bay-space-db";
import { BayPostCategory } from "../../../lib/bay-space-types";

const categories: BayPostCategory[] = [
  "top-story",
  "daily-food",
  "theory",
  "library-submission",
];

function isPostCategory(value: string): value is BayPostCategory {
  return categories.includes(value as BayPostCategory);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;

  if (category && !isPostCategory(category)) {
    return Response.json({ message: "Invalid category" }, { status: 400 });
  }

  return Response.json({ posts: await listPosts(category) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.category || !isPostCategory(body.category)) {
      return Response.json({ message: "Invalid category" }, { status: 400 });
    }

    const post = await createPost({
      category: body.category,
      title: String(body.title ?? "").slice(0, 140),
      body: String(body.body ?? ""),
      anonymous: Boolean(body.anonymous),
      incognito: Boolean(body.incognito),
      author: String(body.author ?? "unknown"),
      shelfLabel: body.shelfLabel ? String(body.shelfLabel) : undefined,
      shelfCode: body.shelfCode ? String(body.shelfCode) : undefined,
      meta:
        body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
          ? body.meta
          : undefined,
    });

    return Response.json({ post }, { status: 201 });
  } catch {
    return Response.json({ message: "Unable to save post" }, { status: 500 });
  }
}
