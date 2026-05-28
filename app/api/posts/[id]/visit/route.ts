import { revalidatePath } from "next/cache";
import {
  getStorageErrorMessage,
  incrementPostVisitCount,
} from "../../../../../lib/bay-space-db";

type PostVisitContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: PostVisitContext) {
  try {
    void request;
    const { id } = await context.params;
    const result = await incrementPostVisitCount(id);

    if (!result) {
      return Response.json({ message: "Post not found" }, { status: 404 });
    }

    revalidatePath("/crypti");
    revalidatePath("/news");
    revalidatePath("/profile/[member]", "page");

    return Response.json({
      post: result.post,
      postVisits: result.postVisits,
    });
  } catch (error) {
    const storageMessage = getStorageErrorMessage(error);

    if (storageMessage) {
      console.error(storageMessage);
      return Response.json({ message: storageMessage }, { status: 503 });
    }

    console.error(error);
    return Response.json({ message: "Unable to count post visit" }, { status: 500 });
  }
}
