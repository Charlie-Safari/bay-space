import { setSignupDraftCookie } from "../../../lib/bay-space-signup-draft";

const creatorRoles = [
  "creator/ influencer - news",
  "creator/ influencer - conspiracy",
];

function normalizeMember(value: string) {
  return value.replace(/\D/g, "").slice(0, 5).padStart(5, "0");
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    member?: string;
    name?: string;
    pin?: string;
    refName?: string;
    roles?: string;
    title?: string;
  };
  const pin = body.pin ?? "";

  if (!pin.trim()) {
    return Response.json({ message: "PIN required" }, { status: 400 });
  }

  const member = normalizeMember(body.member ?? "33334");
  const name = (body.name ?? "explorer").trim().slice(0, 24) || "explorer";
  const refName = (body.refName ?? "").trim().slice(0, 40);
  const roles = body.roles ?? "";
  const title = (body.title ?? "Curious Reader").trim().slice(0, 80);

  await setSignupDraftCookie({
    member,
    name,
    pin,
    refName,
    roles,
    title,
  });

  const params = new URLSearchParams({
    member,
    name,
    ref: refName,
    roles,
    title,
  });
  const selectedRoles = roles.split(",").filter(Boolean);
  const needsCreatorCode = selectedRoles.some((role) =>
    creatorRoles.includes(role),
  );

  return Response.json({
    nextPath: `/join-the-circle/member/${
      needsCreatorCode ? "creator-code" : "report"
    }?${params.toString()}`,
  });
}
