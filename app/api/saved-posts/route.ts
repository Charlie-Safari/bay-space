import {
  countSavedPost,
  countSavedPosts,
  getStorageErrorMessage,
  listSavedPostIds,
  toggleSavedPost,
} from "../../../lib/bay-space-db";
import { getCurrentMember } from "../../../lib/bay-space-session";

function savedPostsErrorResponse(error: unknown) {
  const storageMessage = getStorageErrorMessage(error);

  if (storageMessage) {
    console.error(storageMessage);
    return Response.json({ message: storageMessage }, { status: 503 });
  }

  console.error(error);
  return Response.json({ message: "Unable to load saved posts" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get("counts") === "true") {
      const postIds = (searchParams.get("ids") ?? "")
        .split(",")
        .map((postId) => postId.trim())
        .filter(Boolean);

      return Response.json({ counts: await countSavedPosts(postIds) });
    }

    const member = await getCurrentMember();

    if (!member) {
      return Response.json({ postIds: [] }, { status: 401 });
    }

    return Response.json({ postIds: await listSavedPostIds(member.member) });
  } catch (error) {
    return savedPostsErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { postId?: string };
    const postId = body.postId ?? "";

    if (!postId) {
      return Response.json({ message: "Post required" }, { status: 400 });
    }

    const saved = await toggleSavedPost(member.member, postId);

    return Response.json({
      count: await countSavedPost(postId),
      saved,
    });
  } catch (error) {
    return savedPostsErrorResponse(error);
  }
}
