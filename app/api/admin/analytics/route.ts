import { getStorageErrorMessage } from "../../../../lib/bay-space-db";
import { canAccessAdminAnalytics } from "../../../../lib/bay-space-roles";
import { getCurrentMember } from "../../../../lib/bay-space-session";

export async function GET() {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessAdminAnalytics(member)) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    return Response.json({
      analytics: {
        capturedEvents: 0,
        exchangeEvents: 0,
        memberEvents: 0,
        postEvents: 0,
        status: "ready",
      },
    });
  } catch (error) {
    const storageMessage = getStorageErrorMessage(error);

    if (storageMessage) {
      console.error(storageMessage);
      return Response.json({ message: storageMessage }, { status: 503 });
    }

    console.error(error);
    return Response.json(
      { message: "Unable to load analytics" },
      { status: 500 },
    );
  }
}
