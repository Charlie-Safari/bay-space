import { getStorageErrorMessage } from "../../../lib/bay-space-db";
import { getCurrentMember } from "../../../lib/bay-space-session";

export async function GET() {
  try {
    const member = await getCurrentMember();

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
