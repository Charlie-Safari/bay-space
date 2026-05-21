import Link from "next/link";
import HomeBar from "../../../components/home-bar";

type ReportPageProps = {
  searchParams: Promise<{
    member?: string;
    name?: string;
    ref?: string;
    roles?: string;
    title?: string;
  }>;
};

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const {
    member = "33332",
    name = "explorer",
    ref = name,
    roles = "",
    title = "Curious Reader",
  } = await searchParams;
  const confirmHref = `/join-the-circle/member/confirm?${new URLSearchParams({
    member,
    name,
    ref,
    roles,
    title,
  }).toString()}`;
  const backHref = `/join-the-circle/member/pin?${new URLSearchParams({
    member,
    name,
    ref,
    roles,
    title,
  }).toString()}`;

  return (
    <main className="min-h-screen bg-black text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-5xl flex-col justify-center px-4 py-16">
        <h1 className="mb-8 text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          sign up report
        </h1>
        <div className="border-2 border-[#39ff14] bg-black p-5 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
            EXPLORER NUMBER - #{member}
          </p>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
            TITLE: {title}
          </p>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
            NAME: {name}
          </p>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
            PASSWORD: ******** [CLASSIFIED]
          </p>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
            REFERENCE NAME: {ref || "-----"}
          </p>
        </div>
        <div className="mt-8 flex gap-3">
          <Link
            href={backHref}
            className="border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            back
          </Link>
          <Link
            href={confirmHref}
            className="border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            next
          </Link>
        </div>
      </section>
    </main>
  );
}
