import { revalidatePath } from "next/cache";
import {
  createPostComment,
  deleteRecentPostComment,
  getStorageErrorMessage,
  listPostComments,
} from "../../../../../lib/bay-space-db";
import { getCurrentMember } from "../../../../../lib/bay-space-session";

type PostCommentsContext = {
  params: Promise<{ id: string }>;
};

function commentsErrorResponse(error: unknown) {
  const storageMessage = getStorageErrorMessage(error);

  if (storageMessage) {
    console.error(storageMessage);
    return Response.json({ message: storageMessage }, { status: 503 });
  }

  console.error(error);
  return Response.json({ message: "Unable to load comments" }, { status: 500 });
}

export async function GET(_request: Request, context: PostCommentsContext) {
  try {
    const { id } = await context.params;
    const comments = await listPostComments(id);

    if (!comments) {
      return Response.json({ message: "Post not found" }, { status: 404 });
    }

    return Response.json({ comments });
  } catch (error) {
    return commentsErrorResponse(error);
  }
}

export async function POST(request: Request, context: PostCommentsContext) {
  try {
    const { id } = await context.params;
    const member = await getCurrentMember();

    const body = (await request.json()) as { body?: string };
    const commentBody = (body.body ?? "").trim();

    if (!commentBody) {
      return Response.json({ message: "Comment required" }, { status: 400 });
    }

    const comment = await createPostComment(id, member?.member, commentBody);

    if (!comment) {
      return Response.json({ message: "Post not found" }, { status: 404 });
    }

    revalidatePath("/daily-food");
    revalidatePath("/facts-on-news");
    revalidatePath("/news");
    revalidatePath("/news/post");
    revalidatePath("/theories");

    return Response.json({ comment }, { status: 201 });
  } catch (error) {
    return commentsErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: PostCommentsContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { commentId?: string };
    const commentId = (body.commentId ?? "").trim();

    if (!commentId) {
      return Response.json({ message: "Comment required" }, { status: 400 });
    }

    const deleted = await deleteRecentPostComment(id, commentId);

    if (!deleted) {
      return Response.json(
        { message: "The two-minute delete window has closed" },
        { status: 409 },
      );
    }

    revalidatePath("/daily-food");
    revalidatePath("/facts-on-news");
    revalidatePath("/news");
    revalidatePath("/news/post");
    revalidatePath("/theories");

    return new Response(null, { status: 204 });
  } catch (error) {
    return commentsErrorResponse(error);
  }
}
