import {
  deletePost,
  getStorageErrorMessage,
  updatePostAnonymous,
} from "../../../../lib/bay-space-db";
import { getCurrentMember } from "../../../../lib/bay-space-session";
import { canUseAnonymousPosting } from "../../../../lib/bay-space-roles";
import { revalidatePath } from "next/cache";

type PostContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: PostContext) {
  try {
    const { id } = await context.params;
    void request;
    const member = await getCurrentMember();

    if (!member) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const deleted = await deletePost(id, member);

    if (!deleted) {
      return Response.json({ message: "Post not found" }, { status: 404 });
    }

    revalidatePath("/daily-food");
    revalidatePath("/facts-on-news");
    revalidatePath("/news");
    revalidatePath("/theories");
    revalidatePath("/library");
    revalidatePath("/profile/[member]", "page");

    return new Response(null, { status: 204 });
  } catch (error) {
    const storageMessage = getStorageErrorMessage(error);

    if (storageMessage) {
      console.error(storageMessage);
      return Response.json({ message: storageMessage }, { status: 503 });
    }

    console.error(error);
    return Response.json({ message: "Unable to delete post" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: PostContext) {
  try {
    const { id } = await context.params;
    const member = await getCurrentMember();

    if (!member) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { anonymous?: unknown };

    if (typeof body.anonymous !== "boolean") {
      return Response.json({ message: "Invalid anonymous value" }, { status: 400 });
    }

    if (body.anonymous && !canUseAnonymousPosting(member)) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const post = await updatePostAnonymous(id, member, body.anonymous);

    if (!post) {
      return Response.json({ message: "Post not found" }, { status: 404 });
    }

    revalidatePath("/daily-food");
    revalidatePath("/facts-on-news");
    revalidatePath("/news");
    revalidatePath("/theories");
    revalidatePath("/library");
    revalidatePath("/profile/[member]", "page");

    return Response.json({ post });
  } catch (error) {
    const storageMessage = getStorageErrorMessage(error);

    if (storageMessage) {
      console.error(storageMessage);
      return Response.json({ message: storageMessage }, { status: 503 });
    }

    console.error(error);
    return Response.json({ message: "Unable to update post" }, { status: 500 });
  }
}
