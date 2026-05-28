import Link from "next/link";
import HomeBar from "../../components/home-bar";
import PublicIdCard from "./public-id-card";
import ProfileStatsCard from "./profile-stats-card";
import {
  countSavedPosts,
  getMember,
  getMemberProfileVisitCount,
  listSavedPostsByMember,
  listPostsByAuthor,
} from "../../../lib/bay-space-db";
import { BayPost } from "../../../lib/bay-space-types";
import { isBayoClub, isCrypti } from "../../../lib/bay-space-roles";
import { listCryptiTickers } from "../../../lib/crypti-db";
import { CryptiTicker } from "../../../lib/crypti-types";

type PublicProfileProps = {
  params: Promise<{
    member: string;
  }>;
};

function getPostHref(post: BayPost) {
  if (post.meta?.cryptiPost === "true") {
    return `/crypti/post?id=${post.id}`;
  }

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

function getPostTicketCount(post: BayPost) {
  const count = Number(post.meta?.ticketVotes ?? 0);

  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function TickerList({ tickers }: { tickers: CryptiTicker[] }) {
  if (!tickers.length) {
    return (
      <p className="mt-4 border-l-2 border-[#39ff14] pl-3 text-sm font-bold uppercase tracking-[0.14em] text-[#d7ffd0]">
        empty
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {tickers.map((ticker) => (
        <article
          key={ticker.id}
          className="border border-dashed border-[#1d7f12]/70 bg-black px-3 py-3 text-[#d7ffd0]"
        >
          <span className="block text-lg font-black uppercase tracking-[0.18em] text-[#39ff14]">
            {ticker.symbol}
          </span>
          <span className="mt-2 block text-xs font-black uppercase tracking-[0.14em] text-[#7f9f78]">
            {ticker.assetType || "ticker"}
          </span>
          {ticker.company ? (
            <span className="mt-2 block text-sm font-bold">{ticker.company}</span>
          ) : null}
        </article>
      ))}
    </div>
  );
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
  const favoritePosts = await listSavedPostsByMember(memberId);
  const ownedTickerSymbols = new Set(member?.links?._cryptiOwnedTickers ?? []);
  const ownedTickers = ownedTickerSymbols.size
    ? (await listCryptiTickers()).filter((ticker) =>
        ownedTickerSymbols.has(ticker.symbol),
      )
    : [];
  const favoriteCounts = await countSavedPosts(posts.map((post) => post.id));
  const totalFavoriteCount = Object.values(favoriteCounts).reduce(
    (total, count) => total + count,
    0,
  );
  const totalTicketCount = posts.reduce(
    (total, post) => total + getPostTicketCount(post),
    0,
  );
  const pageVisits = await getMemberProfileVisitCount(memberId);
  const isBayoClubMember = isBayoClub(member?.roles ?? "");
  const isCryptiMember = isCrypti(member?.roles ?? "");

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
  ).map((item) => ({
    href: getExternalHref(item.link.url),
    label: item.label,
  }));

  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\profile&gt; public
        </p>
        <h1 className="text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          {member?.name ?? "profile not found"}
          {isCryptiMember ? " +" : isBayoClubMember ? " 🦉" : ""}
        </h1>

        {member ? (
          <>
            <div className="mt-10 grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)] lg:items-start">
              <PublicIdCard
                favoriteAuthorId={member.member}
                isBayoClubMember={isBayoClubMember}
                isCryptiMember={isCryptiMember}
                links={publicLinks}
                member={{
                  member: member.member,
                  name: member.name,
                  refName: member.refName,
                  title: member.title,
                }}
              />
              <ProfileStatsCard
                initialPageVisits={pageVisits}
                member={member.member}
                totalFavoriteCount={totalFavoriteCount}
                totalTicketCount={totalTicketCount}
              />
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
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

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <section className="border border-[#1d7f12] bg-black p-4">
                <h2 className="text-sm font-black uppercase tracking-[0.16em]">
                  i have this ticker
                </h2>
                <TickerList tickers={ownedTickers} />
              </section>
              <section className="border border-[#1d7f12] bg-black p-4">
                <h2 className="text-sm font-black uppercase tracking-[0.16em]">
                  favorite posts
                </h2>
                <PostList posts={favoritePosts} />
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
