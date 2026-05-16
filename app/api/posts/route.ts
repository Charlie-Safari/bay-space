import {
  createPost,
  getStorageErrorMessage,
  listPosts,
} from "../../../lib/bay-space-db";
import { getCurrentMember } from "../../../lib/bay-space-session";
import { BayPostCategory } from "../../../lib/bay-space-types";
import { canPostCategory } from "../../../lib/bay-space-roles";

const categories: BayPostCategory[] = [
  "top-story",
  "daily-food",
  "theory",
  "library-submission",
];

function isPostCategory(value: string): value is BayPostCategory {
  return categories.includes(value as BayPostCategory);
}

function postsErrorResponse(error: unknown, fallbackMessage: string) {
  const storageMessage = getStorageErrorMessage(error);

  if (storageMessage) {
    console.error(storageMessage);
    return Response.json({ message: storageMessage }, { status: 503 });
  }

  console.error(error);
  return Response.json({ message: fallbackMessage }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? undefined;

    if (category && !isPostCategory(category)) {
      return Response.json({ message: "Invalid category" }, { status: 400 });
    }

    return Response.json({ posts: await listPosts(category) });
  } catch (error) {
    return postsErrorResponse(error, "Unable to load posts");
  }
}

export async function POST(request: Request) {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.category || !isPostCategory(body.category)) {
      return Response.json({ message: "Invalid category" }, { status: 400 });
    }

    if (!canPostCategory(member.roles, body.category)) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const meta =
      body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
        ? { ...body.meta }
        : undefined;

    if (meta) {
      delete meta.accountMarker;
    }

    const post = await createPost(
      {
        category: body.category,
        title: String(body.title ?? "").slice(0, 140),
        body: String(body.body ?? ""),
        anonymous: Boolean(body.anonymous),
        incognito: Boolean(body.incognito),
        author: member.member,
        shelfLabel: body.shelfLabel ? String(body.shelfLabel) : undefined,
        shelfCode: body.shelfCode ? String(body.shelfCode) : undefined,
        meta,
      },
      member,
    );

    return Response.json({ post }, { status: 201 });
  } catch (error) {
    return postsErrorResponse(error, "Unable to save post");
  }
}
