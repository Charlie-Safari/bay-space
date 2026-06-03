import { revalidatePath } from "next/cache";
import {
  getStorageErrorMessage,
  incrementPostShareLinkClickCount,
} from "../../../../../lib/bay-space-db";

type PostShareLinkContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: PostShareLinkContext) {
  try {
    void request;
    const { id } = await context.params;
    const result = await incrementPostShareLinkClickCount(id);

    if (!result) {
      return Response.json({ message: "Post not found" }, { status: 404 });
    }

    revalidatePath("/daily-food");
    revalidatePath("/theories");
    revalidatePath("/library");
    revalidatePath("/crypti");
    revalidatePath("/news");
    revalidatePath("/profile/[member]", "page");

    return Response.json({
      post: result.post,
      shareLinkClicks: result.shareLinkClicks,
    });
  } catch (error) {
    const storageMessage = getStorageErrorMessage(error);

    if (storageMessage) {
      console.error(storageMessage);
      return Response.json({ message: storageMessage }, { status: 503 });
    }

    console.error(error);
    return Response.json(
      { message: "Unable to count share link click" },
      { status: 500 },
    );
  }
}
