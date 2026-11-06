import Link from "next/link";
import HomeBar from "../../components/home-bar";
import PublicCirclesCard from "./public-circles-card";
import PublicIdCard from "./public-id-card";
import ProfileQuickActions from "./profile-quick-actions";
import ProfileTrophyCase from "./profile-trophy-case";
import ProfileStatsCard from "./profile-stats-card";
import ProfilePollScoreCard from "./profile-poll-score-card";
import styles from "./profile.module.css";
import {
  countSavedPosts,
  getMember,
  getMemberProfileVisitCount,
  listSavedPostsByMember,
  listPostsByAuthor,
  listPostsByAuthorForStats,
} from "../../../lib/bay-space-db";
import { getPollStats } from "../../../lib/bay-space-polls";
import { getQuizStats } from "../../../lib/bay-space-quizzes";
import { BayPost } from "../../../lib/bay-space-types";
import {
  isBayoClub,
  isCrypti,
  isOracle,
} from "../../../lib/bay-space-roles";
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
    return `/facts-on-news#post-${post.id}`;
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
      <p className={styles.empty}>
        No posts yet.
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-3">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={getPostHref(post)}
          className={styles.postLink}
        >
          <span className="block text-xs uppercase tracking-[0.14em] text-[#9abc96]">
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
  const pollStats = await getPollStats(memberId);
  const quizStats = await getQuizStats(memberId);
  const isBayoClubMember = isBayoClub(member);
  const isCryptiMember = isCrypti(member);
  const isOracleMember = isOracle(member);
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
    <main className={styles.page}>
      <HomeBar />

      <section className={styles.content}>
        <p className={styles.breadcrumb}>
          C:\BAY-SPACE\PROFILE&gt; PUBLIC
        </p>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {member?.name ?? "profile not found"}
            {isOracleMember
              ? " 🔮"
              : isCryptiMember
                ? " +"
                : isBayoClubMember
                  ? " 🦉"
                  : ""}
          </h1>
          {member ? (
            <ProfileQuickActions
              member={{
                member: member.member,
                name: member.name,
              }}
            />
          ) : null}
        </div>

        {member ? (
          <>
            <div className="mt-10 grid w-full gap-4 lg:grid-cols-3 lg:items-start">
              <PublicIdCard
                favoriteAuthorId={member.member}
                isCryptiMember={isCryptiMember}
                links={publicLinks}
                member={{
                  cryptiRank: isOracleMember
                    ? "Poster V complete"
                    : getCryptiRankLabel(member.cryptiRank),
                  member: member.member,
                  rank: isOracleMember
                    ? "Level 9 - Oracle"
                    : getBayRankLabel(member.rank),
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

            <ProfilePollScoreCard stats={pollStats} quizStats={quizStats} />

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <section className={styles.collection}>
                <h2 className={styles.sectionTitle}>
                  Current Events
                </h2>
                <PostList posts={dailyFoodPosts} />
              </section>
              <section className={styles.collection}>
                <h2 className={styles.sectionTitle}>
                  Conspiracy
                </h2>
                <PostList posts={theoryPosts} />
              </section>
              <section className={styles.collection}>
                <h2 className={styles.sectionTitle}>
                  library
                </h2>
                <PostList posts={libraryPosts} />
              </section>
            </div>

            <div className="mt-8 grid gap-4">
              <section className={styles.collection}>
                <h2 className={styles.sectionTitle}>
                  favorite BaySpace posts
                </h2>
                <PostList posts={favoritePosts} />
              </section>
            </div>
          </>
        ) : (
          <p className={styles.empty}>
            no public profile found
          </p>
        )}
      </section>
    </main>
  );
}
