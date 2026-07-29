import {
  acceptMemberCryptiAgreement,
  applyMemberWildCard,
  changeMemberPin,
  claimMemberMoneyPrinterI,
  completeMember,
  createMemberSession,
  deleteMemberAccount,
  exchangeMemberCoinsForTokens,
  exchangeMemberPointsForCoins,
  getMember,
  getStorageErrorMessage,
  isBaySpaceWildCardAccessKey,
  baySpaceAgreementVersion,
  baySpaceWildCardPointAward,
  purchaseMemberBayoCard,
  purchaseMemberBayoStamp,
  purchaseMemberGateKey,
  purchaseMemberGraduation,
  toggleMemberBayoCard,
  updateMemberReferenceName,
  updateMemberTitle,
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
import { defaultMemberRole } from "../../../../lib/bay-space-roles";
import {
  gateKeys,
  isBayoCardId,
  isBayoStampId,
  type GateKey,
} from "../../../../lib/bay-space-ranks";

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
    activeBayoCards: member.activeBayoCards,
    availablePoints: member.availablePoints,
    bayoCards: member.bayoCards,
    bayoCoins: member.bayoCoins,
    bayoStamps: member.bayoStamps,
    bayoTokens: member.bayoTokens,
    cryptiAgreementAcceptedAt: member.cryptiAgreementAcceptedAt,
    cryptiAgreementVersion: member.cryptiAgreementVersion,
    cryptiRank: member.cryptiRank,
    gateKeys: member.gateKeys,
    lifetimePoints: member.lifetimePoints,
    lifetimeTokens: member.lifetimeTokens,
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
    activeBayoCards: member.activeBayoCards,
    availablePoints: member.availablePoints,
    bayoCards: member.bayoCards,
    bayoCoins: member.bayoCoins,
    bayoStamps: member.bayoStamps,
    bayoTokens: member.bayoTokens,
    cryptiAgreementAcceptedAt: member.cryptiAgreementAcceptedAt,
    cryptiAgreementVersion: member.cryptiAgreementVersion,
    cryptiRank: member.cryptiRank,
    gateKeys: member.gateKeys,
    lifetimePoints: member.lifetimePoints,
    lifetimeTokens: member.lifetimeTokens,
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
      title: pendingMember.name,
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
      card?: string;
      coins?: unknown;
      gateKey?: string;
      points?: unknown;
      stamp?: string;
      settings?: {
        email?: string;
        birthdayMonth?: string;
        birthdayYear?: string;
        cryptiAgreementAccepted?: boolean;
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

    if (body.action === "accept-crypti-agreement") {
      const member = await acceptMemberCryptiAgreement(memberId);

      if (!member) {
        return Response.json(
          { message: "+CRYPTI agreement locked" },
          { status: 403 },
        );
      }

      return Response.json({ member });
    }

    if (body.action === "update-title") {
      const member = await updateMemberTitle(memberId, body.title ?? "");

      if (!member) {
        return Response.json({ message: "Member not found" }, { status: 404 });
      }

      return Response.json({ member });
    }

    if (body.action === "update-reference-name") {
      const member = await updateMemberReferenceName(
        memberId,
        body.refName ?? "",
      );

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

    if (body.action === "exchange-coins") {
      const member = await exchangeMemberCoinsForTokens(
        memberId,
        Number(body.coins),
      );

      if (!member) {
        return Response.json(
          { message: "not enough coins to exchange" },
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
          { message: "gate key locked or not enough balance" },
          { status: 400 },
        );
      }

      return Response.json({ member });
    }

    if (body.action === "purchase-card") {
      if (!body.card || !isBayoCardId(body.card)) {
        return Response.json({ message: "Invalid card" }, { status: 400 });
      }

      const member = await purchaseMemberBayoCard(memberId, body.card);

      if (!member) {
        return Response.json(
          { message: "card locked or not enough tokens" },
          { status: 400 },
        );
      }

      return Response.json({ member });
    }

    if (body.action === "toggle-card") {
      if (!body.card || !isBayoCardId(body.card)) {
        return Response.json({ message: "Invalid card" }, { status: 400 });
      }

      const member = await toggleMemberBayoCard(memberId, body.card);

      if (!member) {
        return Response.json(
          { message: "card locked or no active slots" },
          { status: 400 },
        );
      }

      return Response.json({ member });
    }

    if (body.action === "purchase-stamp") {
      if (!body.stamp || !isBayoStampId(body.stamp)) {
        return Response.json({ message: "Invalid stamp" }, { status: 400 });
      }

      const member = await purchaseMemberBayoStamp(memberId, body.stamp);

      if (!member) {
        return Response.json(
          { message: "not enough coins for stamp" },
          { status: 400 },
        );
      }

      return Response.json({ member });
    }

    if (body.action === "claim-money-printer-i") {
      const result = await claimMemberMoneyPrinterI(memberId);

      if (!result) {
        return Response.json({ message: "Member not found" }, { status: 404 });
      }

      return Response.json(result);
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
          pointAward: baySpaceWildCardPointAward,
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
    if (error instanceof UsernameUnavailableError) {
      return Response.json(
        { message: "reference name unavailable" },
        { status: 409 },
      );
    }

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
