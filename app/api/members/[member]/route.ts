import {
  changeMemberPin,
  completeMember,
  deleteMemberAccount,
  getMember,
  updateMemberSettings,
  wipeMemberAccount,
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
      action?: string;
      settings?: {
        email?: string;
        birthdayMonth?: string;
        birthdayYear?: string;
        links?: {
          x?: { url: string; display: boolean };
          linkedin?: { url: string; display: boolean };
          github?: { url: string; display: boolean };
          youtube?: { url: string; display: boolean };
        };
      };
    };

    if (body.action === "settings") {
      const member = await updateMemberSettings(memberId, body.settings ?? {});

      if (!member) {
        return Response.json({ message: "Member not found" }, { status: 404 });
      }

      return Response.json({ member });
    }

    if (body.action === "wipe-account") {
      await wipeMemberAccount(memberId);
      return Response.json({ ok: true });
    }

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

export async function DELETE(_request: Request, context: MemberContext) {
  const { member: memberId } = await context.params;
  const deleted = await deleteMemberAccount(memberId);

  if (!deleted) {
    return Response.json({ message: "Member not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
