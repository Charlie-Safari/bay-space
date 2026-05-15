import HomeBar from "../../../components/home-bar";
import Link from "next/link";
import PinSetupForm from "./pin-setup-form";

type PinPageProps = {
  searchParams: Promise<{
    member?: string;
    name?: string;
    ref?: string;
    roles?: string;
    title?: string;
  }>;
};

export default async function PinPage({ searchParams }: PinPageProps) {
  const {
    member = "33334",
    name = "explorer",
    ref = "",
    roles = "",
    title = "Curious Reader",
  } = await searchParams;
  const backHref = `/join-the-circle/member/next?${new URLSearchParams({
    member,
    name,
    roles,
  }).toString()}`;

  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\circle\intel&gt; review
        </p>
        <h1 className="text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          review intel
        </h1>

        <div className="mt-10 w-full max-w-2xl border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
            Explorer number - #{member}
          </p>
          <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
            title: {title}
          </p>
          <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
            Name: {name}
          </p>
          <PinSetupForm
            initialRef={ref}
            member={member}
            name={name}
            roles={roles}
            title={title}
          />
        </div>
        <Link
          href={backHref}
          className="mt-8 w-fit border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          back
        </Link>
      </section>
    </main>
  );
}
