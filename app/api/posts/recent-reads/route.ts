import { listRecentArticleReadIds } from "../../../../lib/bay-space-db";
import { getCurrentMember } from "../../../../lib/bay-space-session";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const member = await getCurrentMember({ includeParticipation: false });
    if (!member) return Response.json({ message: "Sign in required." }, { status: 401, headers });

    const category = new URL(request.url).searchParams.get("category");
    if (category !== "theory" && category !== "daily-food") {
      return Response.json({ message: "Unknown article category." }, { status: 400, headers });
    }
    const postIds = await listRecentArticleReadIds(member.member, category);
    return Response.json({ postIds }, { headers });
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Unable to load reading history." }, { status: 503, headers });
  }
}
