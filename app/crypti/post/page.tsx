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
  const hasCryptiAccess = Boolean(member && isCrypti(member));
  const { id } = await searchParams;

  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
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
