import {
  changeMemberPin,
  completeMember,
  getMember,
} from "../../../../lib/bay-space-db";

type MemberContext = {
  params: Promise<{ member: string }>;
};

async function saveCompletedMember(request: Request, context: MemberContext) {
  try {
    const { member: memberId } = await context.params;
    const body = (await request.json()) as {
      confirmPin?: string;
      name?: string;
      refName?: string;
      roles?: string;
      title?: string;
    };
    const pin = body.confirmPin ?? "";

    if (!pin) {
      return Response.json({ message: "PIN required" }, { status: 400 });
    }

    const member = await completeMember(memberId, {
      name: body.name ?? "",
      pin,
      refName: body.refName ?? "",
      roles: body.roles ?? "",
      title: body.title ?? "Curious Reader",
    });

    if (!member) {
      return Response.json({ message: "Member not found" }, { status: 404 });
    }

    return Response.json({ member });
  } catch {
    return Response.json({ message: "Unable to update member" }, { status: 500 });
  }
}

export async function GET(_request: Request, context: MemberContext) {
  const { member: memberId } = await context.params;
  const member = await getMember(memberId);

  if (!member) {
    return Response.json({ message: "Member not found" }, { status: 404 });
  }

  return Response.json({ member });
}

export async function POST(request: Request, context: MemberContext) {
  return saveCompletedMember(request, context);
}

export async function PATCH(request: Request, context: MemberContext) {
  try {
    const { member: memberId } = await context.params;
    const body = (await request.json()) as {
      confirmPin?: string;
      name?: string;
      pin?: string;
      refName?: string;
      roles?: string;
      title?: string;
    };
    const pin = body.pin ?? body.confirmPin ?? "";

    if (!pin) {
      return Response.json({ message: "PIN required" }, { status: 400 });
    }

    const member =
      body.confirmPin !== undefined
        ? await completeMember(memberId, {
            name: body.name ?? "",
            pin,
            refName: body.refName ?? "",
            roles: body.roles ?? "",
            title: body.title ?? "Curious Reader",
          })
        : await changeMemberPin(memberId, pin);

    if (!member) {
      return Response.json({ message: "Member not found" }, { status: 404 });
    }

    return Response.json({ member });
  } catch {
    return Response.json({ message: "Unable to update member" }, { status: 500 });
  }
}
