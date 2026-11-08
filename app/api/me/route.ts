import { getStorageErrorMessage } from "../../../lib/bay-space-db";
import { getCurrentMember } from "../../../lib/bay-space-session";

export async function GET(request: Request) {
  try {
    const member = await getCurrentMember({
      includeParticipation: new URL(request.url).searchParams.get("promotion") === "1",
    });

    if (!member) {
      return Response.json({ member: null }, { status: 401 });
    }

    return Response.json({ member });
  } catch (error) {
    const storageMessage = getStorageErrorMessage(error);

    if (storageMessage) {
      console.error(storageMessage);
      return Response.json({ message: storageMessage }, { status: 503 });
    }

    console.error(error);
    return Response.json({ message: "Unable to load session" }, { status: 500 });
  }
}
