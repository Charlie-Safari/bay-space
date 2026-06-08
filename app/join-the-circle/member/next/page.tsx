import Link from "next/link";
import HomeBar from "../../../components/home-bar";
import {
  getAccountTitle,
  getRoleDescription,
  getRoleReviewLabel,
  isCrypti,
  needsBayoGate,
} from "../../../../lib/bay-space-roles";

type CircleNextProps = {
  searchParams: Promise<{
    member?: string;
    name?: string;
    ref?: string;
    roles?: string;
  }>;
};

export default async function CircleNext({ searchParams }: CircleNextProps) {
  const {
    member = "33332",
    name = "explorer",
    ref = name,
    roles = "",
  } = await searchParams;
  const selectedRoles = (roles || "curious reader").split(",").filter(Boolean);
  const accountTitle = getAccountTitle(selectedRoles.join(","));
  const encodedNext = `/join-the-circle/member/pin?name=${encodeURIComponent(
    name,
  )}&member=${member}&roles=${encodeURIComponent(
    selectedRoles.join(","),
  )}&ref=${encodeURIComponent(ref)}&title=${encodeURIComponent(accountTitle)}`;
  const encodedBack = `/join-the-circle/member?name=${encodeURIComponent(
    name,
  )}&member=${member}&ref=${encodeURIComponent(ref)}`;
  const selectedRole = selectedRoles[0] ?? "";
  const selectedDescription = getRoleDescription(selectedRole);
  const selectedRolesText = selectedRoles.join(",");
  const requiresBayoGate = needsBayoGate(selectedRolesText);
  const requiresCryptiGate = isCrypti(selectedRolesText);

  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\circle\next&gt; signal-select
        </p>
        <h1 className="text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          Member: {member} - {name}
        </h1>
        <p className="mt-8 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-base leading-7 text-[#d7ffd0] sm:text-lg">
          review the selected account type before continuing.
        </p>

        <div className="mt-10 w-full max-w-2xl border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
          <h2 className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
            selected signals
          </h2>
          <div className="mt-4 grid gap-3">
            {selectedRoles.length > 0 ? (
              selectedRoles.map((role) => (
                <p
                  key={role}
                  className="border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#d7ffd0]"
                >
                  {getRoleReviewLabel(role)}
                </p>
              ))
            ) : (
              <p className="border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#d7ffd0]">
                no signals selected
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 w-full max-w-2xl border border-[#1d7f12] bg-[#001100] p-4 text-sm font-bold leading-7 text-[#d7ffd0]">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#39ff14]">
            access notes
          </p>
          {selectedDescription ? <p className="mt-3">{selectedDescription}</p> : null}
          {requiresBayoGate ? (
            <p className="mt-3">
              {requiresCryptiGate
                ? "+CRYPTI requires the access code."
                : "Oracle requires the access code."}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex gap-3">
          <Link
            href={encodedBack}
            className="border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            back
          </Link>
          <Link
            href={encodedNext}
            className="border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            next
          </Link>
        </div>
      </section>
    </main>
  );
}
