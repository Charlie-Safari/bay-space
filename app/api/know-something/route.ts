import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createKnowSomethingPost, deleteKnowSomethingPost } from "../../../lib/bay-space-db";
import { getCurrentMember } from "../../../lib/bay-space-session";
import { knowSomethingDeleteWindowMs } from "../../../lib/theory-categories";

const cookiePath = "/api/know-something";
const cookieName = (id: string) => `bay-space-drop-${id}`;

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ message: "Send a title and a note." }, { status: 415 });
  }
  const input = await request.json().catch(() => null);
  const title = typeof input?.title === "string" ? input.title.trim() : "";
  const body = typeof input?.body === "string" ? input.body : "";
  if (!title || title.length > 140 || !body.trim() || body.length > 50_000) {
    return Response.json({ message: "Enter a title of up to 140 characters and a note of up to 50,000 characters." }, { status: 400 });
  }

  try {
    if (await getCurrentMember()) {
      return Response.json({ message: "The Know Something drop box is for visitors who are signed out." }, { status: 403 });
    }

    const token = randomBytes(32).toString("hex");
    const post = await createKnowSomethingPost(title, body, token);
    const response = NextResponse.json({
      id: post.id,
      deleteUntil: new Date(Date.parse(post.createdAt) + knowSomethingDeleteWindowMs).toISOString(),
    }, { status: 201 });
    response.cookies.set(cookieName(post.id), token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: cookiePath,
      maxAge: knowSomethingDeleteWindowMs / 1000,
    });
    revalidatePath("/theories");
    return response;
  } catch (error) {
    console.error("Unable to publish guest note", error instanceof Error ? error.name : "Unknown error");
    return Response.json({ message: "Unable to publish the note. Please try again." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ message: "Invalid note." }, { status: 400 });
  }
  const token = request.cookies.get(cookieName(id))?.value;
  if (!token) return Response.json({ message: "This note can no longer be deleted from here." }, { status: 403 });

  try {
    if (!(await deleteKnowSomethingPost(id, token))) {
      return Response.json({ message: "The two-minute delete window has closed." }, { status: 410 });
    }
    revalidatePath("/theories");
    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(cookieName(id), "", { path: cookiePath, maxAge: 0 });
    return response;
  } catch {
    return Response.json({ message: "Unable to delete the note. Please try again." }, { status: 503 });
  }
}
