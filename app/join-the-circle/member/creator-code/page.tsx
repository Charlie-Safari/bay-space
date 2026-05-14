import Link from "next/link";
import HomeBar from "../../../components/home-bar";
import CreatorCodeForm from "./creator-code-form";

type CreatorCodePageProps = {
  searchParams: Promise<{
    member?: string;
    name?: string;
    pin?: string;
    ref?: string;
    roles?: string;
    title?: string;
  }>;
};

export default async function CreatorCodePage({
  searchParams,
}: CreatorCodePageProps) {
  const params = await searchParams;
  const query = new URLSearchParams({
    member: params.member ?? "33334",
    name: params.name ?? "explorer",
    pin: params.pin ?? "",
    ref: params.ref ?? "",
    roles: params.roles ?? "",
    title: params.title ?? "Creator / Influencer",
  });
  const backHref = `/join-the-circle/member/pin?${query.toString()}`;

  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\circle\creator-code&gt; verify
        </p>
        <h1 className="text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          enter code
        </h1>
        <p className="mt-8 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-base leading-7 text-[#d7ffd0] sm:text-lg">
          creator access requires a creator code. email
          bayoracle@protonmail.com to request one.
        </p>

        <CreatorCodeForm reportHref={`/join-the-circle/member/report?${query.toString()}`} />
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
