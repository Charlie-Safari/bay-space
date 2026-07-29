import Link from "next/link";
import HomeBar from "../../components/home-bar";
import PublicCirclesCard from "./public-circles-card";
import PublicIdCard from "./public-id-card";
import ProfileTrophyCase from "./profile-trophy-case";
import ProfileStatsCard from "./profile-stats-card";
import {
  countSavedPosts,
  getMember,
  getMemberProfileVisitCount,
  listSavedPostsByMember,
  listPostsByAuthor,
  listPostsByAuthorForStats,
} from "../../../lib/bay-space-db";
import { BayPost } from "../../../lib/bay-space-types";
import { isBayoClub, isCrypti } from "../../../lib/bay-space-roles";
import {
  getBaySpacePostTicketCount,
  getPostVisitCount,
  isBaySpaceProfileScorePost,
  isCryptiPost,
} from "../../../lib/bay-space-scoring";
import {
  bayoCards,
  bayoStamps,
  gateKeys,
  getBayRankLabel,
  getCryptiRankLabel,
} from "../../../lib/bay-space-ranks";

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
  const posts = (await listPostsByAuthor(memberId)).filter(
    (post) => !isCryptiPost(post),
  );
  const favoritePosts = (await listSavedPostsByMember(memberId)).filter(
    (post) => !isCryptiPost(post),
  );
  const statsPosts = (await listPostsByAuthorForStats(memberId)).filter(
    isBaySpaceProfileScorePost,
  );
  const favoriteCounts = await countSavedPosts(
    statsPosts.map((post) => post.id),
  );
  const totalFavoriteCount = Object.values(favoriteCounts).reduce(
    (total, count) => total + count,
    0,
  );
  const totalTicketCount = statsPosts.reduce(
    (total, post) => total + getBaySpacePostTicketCount(post),
    0,
  );
  const totalPostVisitCount = statsPosts.reduce(
    (total, post) => total + getPostVisitCount(post),
    0,
  );
  const pageVisits = await getMemberProfileVisitCount(memberId);
  const isBayoClubMember = isBayoClub(member);
  const isCryptiMember = isCrypti(member);
  const ownedBadges = member
    ? [
        ...(member.rank === "graduation" ? ["Graduation"] : []),
        ...gateKeys
          .filter((gateKey) => member.gateKeys.includes(gateKey.id))
          .map((gateKey) => gateKey.label),
      ]
    : [];
  const ownedCards = member
    ? bayoCards
        .filter((card) => member.bayoCards.includes(card.id))
        .map((card) => card.label)
    : [];
  const ownedStamps = member
    ? bayoStamps
        .filter((stamp) => member.bayoStamps.includes(stamp.id))
        .map((stamp) => stamp.label)
    : [];

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
          C:\BAY-SPACE\PROFILE&gt; PUBLIC
        </p>
        <h1 className="text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          {member?.name ?? "profile not found"}
          {isCryptiMember ? " +" : isBayoClubMember ? " 🦉" : ""}
        </h1>

        {member ? (
          <>
            <div className="mt-10 grid w-full gap-4 lg:grid-cols-3 lg:items-start">
              <PublicIdCard
                favoriteAuthorId={member.member}
                isCryptiMember={isCryptiMember}
                links={publicLinks}
                member={{
                  cryptiRank: getCryptiRankLabel(member.cryptiRank),
                  member: member.member,
                  rank: getBayRankLabel(member.rank),
                  refName: member.refName,
                }}
              />
              <ProfileStatsCard
                initialPageVisits={pageVisits}
                lifetimePoints={member.lifetimePoints}
                lifetimeTokens={member.lifetimeTokens}
                member={member.member}
                totalFavoriteCount={totalFavoriteCount}
                totalPostCount={statsPosts.length}
                totalPostVisitCount={totalPostVisitCount}
                totalTicketCount={totalTicketCount}
              />
              <PublicCirclesCard
                member={{
                  member: member.member,
                  name: member.name,
                }}
              />
            </div>

            <ProfileTrophyCase
              badges={ownedBadges}
              cards={ownedCards}
              stamps={ownedStamps}
            />

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

            <div className="mt-8 grid gap-4">
              <section className="border border-[#1d7f12] bg-black p-4">
                <h2 className="text-sm font-black uppercase tracking-[0.16em]">
                  favorite BaySpace posts
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
