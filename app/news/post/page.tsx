import Link from "next/link";
import HomeBar from "../../components/home-bar";
import TopStoryPost from "./top-story-post";

type TopStoryPostPageProps = {
  searchParams: Promise<{
    id?: string;
  }>;
};

export default async function TopStoryPostPage({
  searchParams,
}: TopStoryPostPageProps) {
  const { id } = await searchParams;

  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\top-story&gt; full-post
        </p>
        <h1 className="text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          top story
        </h1>
        <Link
          href="/news"
          className="mb-8 mt-6 w-fit border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          back to banner
        </Link>
        <TopStoryPost postId={id} />
      </section>
    </main>
  );
}
