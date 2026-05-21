import {
  getStorageErrorMessage,
  incrementMemberProfileVisitCount,
} from "../../../../../lib/bay-space-db";

type MemberVisitContext = {
  params: Promise<{ member: string }>;
};

export async function POST(request: Request, context: MemberVisitContext) {
  try {
    void request;
    const { member } = await context.params;
    const pageVisits = await incrementMemberProfileVisitCount(member);

    if (pageVisits === null) {
      return Response.json({ message: "Member not found" }, { status: 404 });
    }

    return Response.json({ pageVisits });
  } catch (error) {
    const storageMessage = getStorageErrorMessage(error);

    if (storageMessage) {
      console.error(storageMessage);
      return Response.json({ message: storageMessage }, { status: 503 });
    }

    console.error(error);
    return Response.json({ message: "Unable to update visits" }, { status: 500 });
  }
}
