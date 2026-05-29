import {
  getMemberCryptiProfileVisitCount,
  getStorageErrorMessage,
  incrementMemberCryptiProfileVisitCount,
} from "../../../../../../lib/bay-space-db";

type CryptiMemberVisitContext = {
  params: Promise<{ member: string }>;
};

export async function GET(request: Request, context: CryptiMemberVisitContext) {
  try {
    void request;
    const { member } = await context.params;

    return Response.json({
      pageVisits: await getMemberCryptiProfileVisitCount(member),
    });
  } catch (error) {
    const storageMessage = getStorageErrorMessage(error);

    if (storageMessage) {
      console.error(storageMessage);
      return Response.json({ message: storageMessage }, { status: 503 });
    }

    console.error(error);
    return Response.json({ message: "Unable to load visits" }, { status: 500 });
  }
}

export async function POST(request: Request, context: CryptiMemberVisitContext) {
  try {
    void request;
    const { member } = await context.params;
    const pageVisits = await incrementMemberCryptiProfileVisitCount(member);

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
