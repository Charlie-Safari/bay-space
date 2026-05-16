import Link from "next/link";
import HomeBar from "../../components/home-bar";
import { getMember, listPostsByAuthor } from "../../../lib/bay-space-db";
import { BayPost } from "../../../lib/bay-space-types";
import { getRoleAcronym } from "../../../lib/bay-space-roles";

type PublicProfileProps = {
  params: Promise<{
    member: string;
  }>;
};

function getPostHref(post: BayPost) {
  if (post.category === "top-story") {
    return `/news/post?id=${post.id}`;
  }

  if (post.category === "daily-food") {
    return `/daily-food#post-${post.id}`;
  }

  if (post.category === "theory") {
    return `/theories#post-${post.id}`;
  }

  return `/library#library-${post.id}`;
}

function getExternalHref(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `https://${url}`;
}

function PostList({ posts }: { posts: BayPost[] }) {
  if (!posts.length) {
    return (
      <p className="mt-4 border-l-2 border-[#39ff14] pl-3 text-sm font-bold uppercase tracking-[0.14em] text-[#d7ffd0]">
        empty
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-3">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={getPostHref(post)}
          className="border border-dashed border-[#1d7f12]/70 bg-black px-3 py-3 text-[#d7ffd0] transition hover:border-[#39ff14] hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          <span className="block text-xs uppercase tracking-[0.14em] text-[#7f9f78]">
            {new Date(post.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="mt-2 block text-sm font-bold">{post.title}</span>
        </Link>
      ))}
    </div>
  );
}

export default async function PublicProfile({ params }: PublicProfileProps) {
  const { member: memberId } = await params;
  const member = await getMember(memberId);
  const posts = await listPostsByAuthor(memberId);
  const accountMarker = getRoleAcronym(member?.roles ?? "");

  const topStoryPosts = posts.filter((post) => post.category === "top-story");
  const dailyFoodPosts = posts.filter((post) => post.category === "daily-food");
  const theoryPosts = posts.filter((post) => post.category === "theory");
  const libraryPosts = posts
    .filter((post) => post.category === "library-submission" || post.shelfCode)
    .sort((leftPost, rightPost) => leftPost.title.localeCompare(rightPost.title));
  const publicLinks = [
    { label: "X", link: member?.links?.x },
    { label: "linkd in", link: member?.links?.linkedin },
    { label: "github", link: member?.links?.github },
    { label: "youtube", link: member?.links?.youtube },
  ].filter(
    (item): item is { label: string; link: { url: string; display: boolean } } =>
      Boolean(item.link?.display && item.link.url),
  );

  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\profile&gt; public
        </p>
        <h1 className="text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          {member?.name ?? "profile not found"}
        </h1>

        {member ? (
          <>
            <details className="mt-10 w-full max-w-2xl border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
              <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                ID card
              </summary>
              <div className="mt-5 grid gap-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                <p>EXPLORER NUMBER - #{member.member}</p>
                <p>TITLE: {member.title}</p>
                {accountMarker ? <p>ID CARD: ({accountMarker})</p> : null}
                <p>NAME: {member.name}</p>
                <p>(REFERENCE NAME): {member.refName || "-----"}</p>
              </div>
              {publicLinks.length ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  {publicLinks.map((item) => (
                    <a
                      key={item.label}
                      href={getExternalHref(item.link.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </details>

            <div className="mt-8 grid gap-4 lg:grid-cols-4">
              <section className="border border-[#1d7f12] bg-black p-4">
                <h2 className="text-sm font-black uppercase tracking-[0.16em]">
                  Top Story
                </h2>
                <PostList posts={topStoryPosts} />
              </section>
              <section className="border border-[#1d7f12] bg-black p-4">
                <h2 className="text-sm font-black uppercase tracking-[0.16em]">
                  Daily Food
                </h2>
                <PostList posts={dailyFoodPosts} />
              </section>
              <section className="border border-[#1d7f12] bg-black p-4">
                <h2 className="text-sm font-black uppercase tracking-[0.16em]">
                  theories
                </h2>
                <PostList posts={theoryPosts} />
              </section>
              <section className="border border-[#1d7f12] bg-black p-4">
                <h2 className="text-sm font-black uppercase tracking-[0.16em]">
                  library
                </h2>
                <PostList posts={libraryPosts} />
              </section>
            </div>
          </>
        ) : (
          <p className="mt-8 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-base leading-7 text-[#d7ffd0]">
            no public profile found
          </p>
        )}
      </section>
    </main>
  );
}
