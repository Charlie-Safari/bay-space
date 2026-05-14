import Link from "next/link";
import HomeBar from "../../../components/home-bar";
import PasswordConfirmForm from "./password-confirm-form";

type ConfirmPageProps = {
  searchParams: Promise<{
    member?: string;
    name?: string;
    pin?: string;
    ref?: string;
    roles?: string;
    title?: string;
  }>;
};

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams;
  const member = params.member ?? "33334";
  const name = params.name ?? "explorer";
  const pin = params.pin ?? "";
  const ref = params.ref ?? "";
  const roles = params.roles ?? "";
  const title = params.title ?? "Curious Reader";
  const backHref = `/join-the-circle/member/report?${new URLSearchParams({
    member,
    name,
    pin,
    ref,
    roles,
    title,
  }).toString()}`;

  return (
    <main className="min-h-screen bg-black text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-5xl flex-col justify-center px-4 py-16">
        <p className="max-w-3xl text-2xl font-black uppercase leading-snug tracking-[0.12em] text-[#39ff14] [text-shadow:0_0_14px_#39ff14]">
          there is no reset password option yet - you are responsible for
          keeping track of your own password
        </p>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
          please confirm password here
        </p>

        <PasswordConfirmForm
          member={member}
          name={name}
          pin={pin}
          refName={ref}
          roles={roles}
          title={title}
        />
        <Link
          href={backHref}
          className="mt-6 w-fit border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          back
        </Link>
      </section>
    </main>
  );
}
