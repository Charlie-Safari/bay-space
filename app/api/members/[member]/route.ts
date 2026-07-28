import {
  applyMemberWildCard,
  changeMemberPin,
  completeMember,
  createMemberSession,
  deleteMemberAccount,
  exchangeMemberPointsForCoins,
  getMember,
  getStorageErrorMessage,
  isBaySpaceWildCardAccessKey,
  baySpaceAgreementVersion,
  baySpaceWildCardPointFloor,
  purchaseMemberGateKey,
  purchaseMemberGraduation,
  updateMemberSettings,
  wipeMemberAccount,
  UsernameUnavailableError,
} from "../../../../lib/bay-space-db";
import {
  clearSignupDraftCookie,
  getSignupDraftCookie,
  verifySignupDraftPin,
} from "../../../../lib/bay-space-signup-draft";
import {
  getCurrentMember,
  setSessionCookie,
} from "../../../../lib/bay-space-session";
import {
  defaultMemberRole,
  defaultMemberTitle,
} from "../../../../lib/bay-space-roles";
import { gateKeys, type GateKey } from "../../../../lib/bay-space-ranks";

type MemberContext = {
  params: Promise<{ member: string }>;
};

function normalizeMemberId(memberId: string) {
  return memberId.replace(/\D/g, "").slice(0, 5).padStart(5, "0");
}

function canManageMember(
  actor: { member: string } | null,
  targetMemberId: string,
) {
  return (
    Boolean(actor) &&
    actor?.member === normalizeMemberId(targetMemberId)
  );
}

type ApiMember = NonNullable<Awaited<ReturnType<typeof getMember>>>;

function publicMember(member: ApiMember) {
  return {
    availablePoints: member.availablePoints,
    bayoCoins: member.bayoCoins,
    cryptiRank: member.cryptiRank,
    gateKeys: member.gateKeys,
    lifetimePoints: member.lifetimePoints,
    member: member.member,
    name: member.name,
    purchasedTitles: member.purchasedTitles,
    rank: member.rank,
    refName: member.refName,
    roles: member.roles,
    title: member.title,
    createdAt: member.createdAt,
    links: {
      x: member.links?.x?.display ? member.links.x : undefined,
      linkedin: member.links?.linkedin?.display
        ? member.links.linkedin
        : undefined,
      github: member.links?.github?.display ? member.links.github : undefined,
      youtube: member.links?.youtube?.display ? member.links.youtube : undefined,
    },
  };
}

function privateMember(member: ApiMember) {
  return {
    availablePoints: member.availablePoints,
    bayoCoins: member.bayoCoins,
    cryptiRank: member.cryptiRank,
    gateKeys: member.gateKeys,
    lifetimePoints: member.lifetimePoints,
    member: member.member,
    name: member.name,
    purchasedTitles: member.purchasedTitles,
    rank: member.rank,
    refName: member.refName,
    roles: member.roles,
    title: member.title,
    createdAt: member.createdAt,
    email: member.email ?? "",
    birthdayMonth: member.birthdayMonth ?? "",
    birthdayYear: member.birthdayYear ?? "",
    links: member.links,
  };
}

function memberErrorResponse(error: unknown, fallbackMessage: string) {
  const storageMessage = getStorageErrorMessage(error);

  if (storageMessage) {
    console.error(storageMessage);
    return Response.json({ message: storageMessage }, { status: 503 });
  }

  console.error(error);
  return Response.json({ message: fallbackMessage }, { status: 500 });
}

async function saveCompletedMember(request: Request, context: MemberContext) {
  try {
    const { member: memberId } = await context.params;
    void memberId;
    const body = (await request.json()) as {
      agreementAccepted?: boolean;
      bayoPlusAgreementAccepted?: boolean;
      confirmPin?: string;
      name?: string;
      pin?: string;
      refName?: string;
    };
    const pin = body.pin ?? body.confirmPin ?? "";
    const draft = await getSignupDraftCookie();

    if (!pin) {
      return Response.json({ message: "password required" }, { status: 400 });
    }

    if (body.agreementAccepted !== true) {
      return Response.json({ message: "agreement required" }, { status: 400 });
    }

    if (draft && !verifySignupDraftPin(draft, pin)) {
      return Response.json({ message: "Invalid signup draft" }, { status: 400 });
    }

    if (!draft && !(body.name ?? "").trim()) {
      return Response.json({ message: "username required" }, { status: 400 });
    }

    const pendingMember = {
      member: draft?.member ?? normalizeMemberId(memberId),
      name: draft?.name ?? body.name ?? "",
      refName: draft?.refName ?? body.refName ?? body.name ?? "",
    };

    const member = await completeMember(pendingMember.member, {
      name: pendingMember.name,
      pin,
      refName: pendingMember.refName,
      roles: defaultMemberRole,
      title: defaultMemberTitle,
      agreementAcceptedAt: new Date().toISOString(),
      agreementVersion: baySpaceAgreementVersion,
    });

    if (!member) {
      return Response.json({ message: "Member not found" }, { status: 404 });
    }

    const sessionToken = await createMemberSession(member.member);

    if (!sessionToken) {
      return Response.json({ message: "Unable to create session" }, { status: 500 });
    }

    await setSessionCookie(sessionToken);

    if (draft) {
      await clearSignupDraftCookie();
    }

    return Response.json({ member });
  } catch (error) {
    if (error instanceof UsernameUnavailableError) {
      return Response.json(
        { message: "username unavailable" },
        { status: 409 },
      );
    }

    return memberErrorResponse(error, "Unable to update member");
  }
}

export async function GET(_request: Request, context: MemberContext) {
  try {
    const { member: memberId } = await context.params;
    const actor = await getCurrentMember();
    const member = await getMember(memberId);

    if (!member) {
      return Response.json({ message: "Member not found" }, { status: 404 });
    }

    return Response.json({
      member: canManageMember(actor, memberId)
        ? privateMember(member)
        : publicMember(member),
    });
  } catch (error) {
    return memberErrorResponse(error, "Unable to load member");
  }
}

export async function POST(request: Request, context: MemberContext) {
  return saveCompletedMember(request, context);
}

export async function PATCH(request: Request, context: MemberContext) {
  try {
    const { member: memberId } = await context.params;
    const actor = await getCurrentMember();

    if (!canManageMember(actor, memberId)) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      confirmPin?: string;
      name?: string;
      pin?: string;
      refName?: string;
      roles?: string;
      title?: string;
      action?: string;
      accessKey?: string;
      gateKey?: string;
      points?: unknown;
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

    if (body.action === "exchange-points") {
      const member = await exchangeMemberPointsForCoins(
        memberId,
        Number(body.points),
      );

      if (!member) {
        return Response.json(
          { message: "not enough points to exchange" },
          { status: 400 },
        );
      }

      return Response.json({ member });
    }

    if (body.action === "purchase-graduation") {
      const member = await purchaseMemberGraduation(memberId);

      if (!member) {
        return Response.json(
          { message: "not enough coins for graduation" },
          { status: 400 },
        );
      }

      return Response.json({ member });
    }

    if (body.action === "purchase-gate-key") {
      const gateKey = gateKeys.find(
        (candidate) => candidate.id === body.gateKey,
      )?.id as GateKey | undefined;

      if (!gateKey) {
        return Response.json({ message: "Invalid gate key" }, { status: 400 });
      }

      const member = await purchaseMemberGateKey(memberId, gateKey);

      if (!member) {
        return Response.json(
          { message: "gate key locked or not enough coins" },
          { status: 400 },
        );
      }

      return Response.json({ member });
    }

    if (body.action === "wild-card") {
      if (!isBaySpaceWildCardAccessKey(body.accessKey ?? "")) {
        return Response.json({ message: "access key rejected" }, { status: 403 });
      }

      const member = await applyMemberWildCard(memberId);

      if (!member) {
        return Response.json({ message: "Member not found" }, { status: 404 });
      }

      return Response.json({
        member,
        wildCard: {
          pointFloor: baySpaceWildCardPointFloor,
          rank: member.rank,
        },
      });
    }

    if (body.action === "wipe-account") {
      await wipeMemberAccount(memberId);
      return Response.json({ ok: true });
    }

    const pin = body.pin ?? body.confirmPin ?? "";

    if (!pin) {
      return Response.json({ message: "PIN required" }, { status: 400 });
    }

    const member = await changeMemberPin(memberId, pin);

    if (!member) {
      return Response.json({ message: "Member not found" }, { status: 404 });
    }

    return Response.json({ member });
  } catch (error) {
    return memberErrorResponse(error, "Unable to update member");
  }
}

export async function DELETE(_request: Request, context: MemberContext) {
  try {
    const { member: memberId } = await context.params;
    const actor = await getCurrentMember();

    if (!canManageMember(actor, memberId)) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const deleted = await deleteMemberAccount(memberId);

    if (!deleted) {
      return Response.json({ message: "Member not found" }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return memberErrorResponse(error, "Unable to delete member");
  }
}
