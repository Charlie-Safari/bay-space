import { getStorageErrorMessage } from "../../../lib/bay-space-db";
import { revokeCurrentSession } from "../../../lib/bay-space-session";

export async function POST() {
  try {
    await revokeCurrentSession();

    return Response.json({ ok: true });
  } catch (error) {
    const storageMessage = getStorageErrorMessage(error);

    if (storageMessage) {
      console.error(storageMessage);
      return Response.json({ message: storageMessage }, { status: 503 });
    }

    console.error(error);
    return Response.json({ message: "Unable to log out" }, { status: 500 });
  }
}
