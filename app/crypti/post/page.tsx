import Link from "next/link";
import HomeBar from "../../components/home-bar";
import CryptiPostDetail from "./post-detail";
import { getCurrentMember } from "../../../lib/bay-space-session";
import { isCrypti } from "../../../lib/bay-space-roles";

type CryptiPostPageProps = {
  searchParams: Promise<{
    id?: string;
  }>;
};

export default async function CryptiPostPage({
  searchParams,
}: CryptiPostPageProps) {
  const member = await getCurrentMember();
  const hasCryptiAccess = Boolean(member && isCrypti(member.roles));
  const { id } = await searchParams;

  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\+crypti&gt; post
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-5xl font-black uppercase tracking-[0.18em] text-[#d7ffd0] [text-shadow:0_0_16px_#39ff14] sm:text-7xl">
            +CRYPTI
          </h1>
          <Link
            href="/crypti"
            className="mb-2 w-fit border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            back to crypti
          </Link>
        </div>
        {hasCryptiAccess ? (
          <CryptiPostDetail postId={id} />
        ) : (
          <div className="mt-10 max-w-2xl border-2 border-[#1d7f12] bg-black p-5 shadow-[0_0_18px_rgba(57,255,20,0.16)]">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
              crypti account required
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
