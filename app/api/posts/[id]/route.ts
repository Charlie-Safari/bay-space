import { deletePost } from "../../../../lib/bay-space-db";

type PostContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: PostContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const author = searchParams.get("author") ?? "";

  if (!author) {
    return Response.json({ message: "Author required" }, { status: 400 });
  }

  const deleted = await deletePost(id, author);

  if (!deleted) {
    return Response.json({ message: "Post not found" }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
