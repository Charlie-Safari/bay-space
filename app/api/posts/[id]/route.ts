import {
  deletePost,
  getStorageErrorMessage,
} from "../../../../lib/bay-space-db";
import { getCurrentMember } from "../../../../lib/bay-space-session";

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
