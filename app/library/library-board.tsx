"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BayPost,
  getBayPosts,
  postStoreEvent,
} from "../components/post-store";
import CopyPostLinkButton from "../components/copy-post-link-button";
import FavoriteButton from "../components/favorite-button";
import { baySpaceHowToOpenEvent } from "../components/mountain-time-footer";
import {
  countFavoritePosts,
  favoriteStoreEvent,
} from "../components/favorite-store";
import { recordPostVisit } from "../components/post-visit-client";
import { isBayoClub } from "../../lib/bay-space-roles";
import {
  formatPointTenths,
  getBaySpacePostPointTenths,
  isCryptiPost,
} from "../../lib/bay-space-scoring";
import { theoryCategories } from "../../lib/theory-categories";
import {
  doPostTopicTagsMatchQuery,
  getMatchingPostTopicTags,
  getPostTopicTags,
  getPostTopicTagSearchText,
} from "../../lib/bay-space-tags";

type SavedMember = {
  member: string;
  name: string;
  roles?: string;
};

function getLibraryHashId() {
  if (typeof window === "undefined") {
    return "";
  }

  const postId = window.location.hash.replace(/^#library-/, "");

  return postId === window.location.hash ? "" : postId;
}

function getPostSources(post: BayPost) {
  const sourceLinks = post.meta?.sourceLinks;
  const sources = post.meta?.sources;
  const source = post.meta?.source;

  return [
    ...(Array.isArray(sourceLinks) ? sourceLinks : []),
    ...(Array.isArray(sources) ? sources : []),
    ...(typeof source === "string" && source ? [source] : []),
  ];
}

function getSourceHref(source: string) {
  return source.startsWith("http://") || source.startsWith("https://")
    ? source
    : `https://${source}`;
}

function isLibraryPost(post: BayPost) {
  return post.category === "library-submission" || Boolean(post.shelfCode);
}

function isTagSearchPost(post: BayPost) {
  return (
    !post.incognito &&
    (post.category === "daily-food" || post.category === "theory")
  );
}

function getPostChannelLabel(post: BayPost) {
  if (post.category === "daily-food") {
    return "Facts on News";
  }

  if (post.category === "theory") {
    return "Conspiracy";
  }

  if (post.category === "top-story") {
    return "Top Story";
  }

  return "Library";
}

function getPostLinkPath(post: BayPost) {
  if (post.category === "daily-food") {
    return `/facts-on-news#post-${post.id}`;
  }

  if (post.category === "theory") {
    return `/theories#post-${post.id}`;
  }

  if (post.category === "top-story") {
    return `/news/post?id=${post.id}`;
  }

  return `/library#library-${post.id}`;
}

function getLibrarySearchText(post: BayPost) {
  return [
    post.title,
    post.body,
    post.shelfLabel ?? "",
    post.shelfCode ?? "",
    getPostSources(post).join(" "),
    getPostTopicTagSearchText(post),
  ]
    .join(" ")
    .toLowerCase();
}

export default function LibraryBoard() {
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<BayPost[]>([]);
  const [members, setMembers] = useState<SavedMember[]>([]);
  const [favoritePostCounts, setFavoritePostCounts] = useState<
    Record<string, number>
  >({});
  const [isHowToOpen, setIsHowToOpen] = useState(false);
  const [openPostId, setOpenPostId] = useState(getLibraryHashId);

  useEffect(() => {
    function syncPosts() {
      getBayPosts().then((savedPosts) => {
        setPosts(savedPosts.filter((post) => !isCryptiPost(post)));
      });
    }

    syncPosts();
    fetch("/api/members", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { members: [] }))
      .then((data: { members?: SavedMember[] }) => {
        setMembers(data.members ?? []);
      });
    window.addEventListener("storage", syncPosts);
    window.addEventListener(postStoreEvent, syncPosts);

    return () => {
      window.removeEventListener("storage", syncPosts);
      window.removeEventListener(postStoreEvent, syncPosts);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function syncFavoriteCounts() {
      const counts = await countFavoritePosts(posts.map((post) => post.id));

      if (isMounted) {
        setFavoritePostCounts(counts);
      }
    }

    syncFavoriteCounts();
    window.addEventListener(favoriteStoreEvent, syncFavoriteCounts);
    window.addEventListener(postStoreEvent, syncFavoriteCounts);

    return () => {
      isMounted = false;
      window.removeEventListener(favoriteStoreEvent, syncFavoriteCounts);
      window.removeEventListener(postStoreEvent, syncFavoriteCounts);
    };
  }, [posts]);

  function getAuthorName(post: BayPost) {
    return members.find((member) => member.member === post.author)?.name.trim() ?? "";
  }

  function getAuthorRoles(post: BayPost) {
    return members.find((member) => member.member === post.author)?.roles ?? "";
  }

  function getAuthorDisplayName(post: BayPost) {
    const authorName = getAuthorName(post);

    if (!authorName) {
      return "";
    }

    return isBayoClub(getAuthorRoles(post)) ? `${authorName} 🦉` : authorName;
  }

  function canShowOracleAnonProfile(post: BayPost) {
    return post.anonymous && post.author !== "unknown" && isBayoClub(getAuthorRoles(post));
  }

  useEffect(() => {
    function openHowTo() {
      setIsHowToOpen(true);
      window.requestAnimationFrame(() => {
        document.getElementById("how-to")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }

    function openFromHash() {
      if (window.location.hash === "#how-to") {
        openHowTo();
        return;
      }

      const postId = getLibraryHashId();

      if (!postId) {
        return;
      }

      setOpenPostId(postId);
    }

    openFromHash();
    window.addEventListener(baySpaceHowToOpenEvent, openHowTo);
    window.addEventListener("hashchange", openFromHash);

    return () => {
      window.removeEventListener(baySpaceHowToOpenEvent, openHowTo);
      window.removeEventListener("hashchange", openFromHash);
    };
  }, []);

  useEffect(() => {
    if (!openPostId) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(`library-${openPostId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [openPostId, posts]);

  useEffect(() => {
    if (!openPostId) {
      return;
    }

    let isMounted = true;

    recordPostVisit(openPostId)
      .then((postVisits) => {
        if (!isMounted || typeof postVisits !== "number") {
          return;
        }

        setPosts((currentPosts) =>
          currentPosts.map((post) =>
            post.id === openPostId
              ? {
                  ...post,
                  meta: {
                    ...(post.meta ?? {}),
                    postVisits: String(postVisits),
                  },
                }
              : post,
          ),
        );
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [openPostId]);

  const visiblePosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts
      .filter((post) => {
        if (!normalizedQuery) {
          return isLibraryPost(post);
        }

        if (isLibraryPost(post)) {
          return getLibrarySearchText(post).includes(normalizedQuery);
        }

        return isTagSearchPost(post) && doPostTopicTagsMatchQuery(post, query);
      })
      .sort((leftPost, rightPost) =>
        leftPost.title.localeCompare(rightPost.title),
      );
  }, [posts, query]);

  return (
    <div className="mt-10 grid max-w-3xl gap-5">
      <label className="grid w-fit gap-2">
        <span className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
          organize
        </span>
        <select
          value="az"
          className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black uppercase tracking-[0.16em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
          disabled
        >
          <option value="az">A-Z</option>
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
          search library context
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
        />
      </label>

      {visiblePosts.length ? (
        <div className="grid gap-3">
          {visiblePosts.map((post) => {
            const postScore = formatPointTenths(
              getBaySpacePostPointTenths(post, favoritePostCounts),
            );
            const matchingTopicTags = query.trim()
              ? getMatchingPostTopicTags(post, query)
              : [];
            const topicTags = getPostTopicTags(post);
            const postChannelLabel = getPostChannelLabel(post);

            return (
            <article
              key={post.id}
              id={`library-${post.id}`}
              className="border-2 border-[#1d7f12] bg-black px-4 py-4 transition hover:border-[#39ff14]"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenPostId((currentId) =>
                    currentId === post.id ? "" : post.id,
                  )
                }
                className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
              >
                <span className="block text-xs font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                  {isLibraryPost(post)
                    ? `shelf label: ${post.shelfLabel || post.title}`
                    : `${postChannelLabel} tag match`}
                </span>
                <span className="mt-2 block text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
                  channel: {postChannelLabel}
                </span>
                <span className="mt-2 block text-xl font-black uppercase tracking-[0.14em]">
                  {post.title}
                </span>
                {matchingTopicTags.length ? (
                  <span className="mt-3 flex flex-wrap gap-2">
                    {matchingTopicTags.map((tag) => (
                      <span
                        key={tag}
                        className="border border-[#1d7f12] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#39ff14]"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
              {openPostId === post.id ? (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                      {postScore} pts
                    </p>
                    <FavoriteButton
                      onCountChange={(count) =>
                        setFavoritePostCounts((counts) => ({
                          ...counts,
                          [post.id]: count,
                        }))
                      }
                      postId={post.id}
                    />
                  </div>
                  <div className="mt-3">
                    <CopyPostLinkButton path={getPostLinkPath(post)} />
                  </div>
                  {!post.anonymous && getAuthorName(post) ? (
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                      <Link
                        href={`/profile/${post.author}`}
                        className="underline decoration-[#39ff14] underline-offset-4 transition hover:text-[#39ff14]"
                      >
                        {getAuthorDisplayName(post)}
                      </Link>
                    </p>
                  ) : post.anonymous ? (
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                      {canShowOracleAnonProfile(post) ? (
                        <Link
                          href={`/profile/${post.author}`}
                          className="underline decoration-[#39ff14] underline-offset-4 transition hover:text-[#39ff14]"
                        >
                          anon
                        </Link>
                      ) : (
                        "classified"
                      )}
                    </p>
                  ) : null}
                  <span className="mt-3 block whitespace-pre-wrap text-sm font-bold leading-6">
                    {post.body}
                  </span>
                  {getPostSources(post).length ? (
                    <div className="mt-4 grid gap-1">
                      {getPostSources(post).map((source) => (
                        <a
                          key={source}
                          href={getSourceHref(source)}
                          className="grid grid-cols-[1.5rem_1fr] text-xs font-black uppercase tracking-[0.14em] text-[#7f9f78] transition hover:text-[#39ff14]"
                        >
                          <span>+</span>
                          <span className="break-all">{source}</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {topicTags.length ? (
                    <section className="mt-5 border-t border-[#1d7f12] pt-3">
                      <h3 className="text-xs font-black uppercase tracking-[0.24em] text-[#7f9f78]">
                        TAGS
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {topicTags.map((tag) => (
                          <span
                            key={tag}
                            className="border border-[#1d7f12] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#39ff14]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              ) : null}
            </article>
            );
          })}
        </div>
      ) : (
        <div className="border-2 border-[#1d7f12] bg-black px-4 py-4 text-sm font-bold uppercase tracking-[0.16em] text-[#d7ffd0]">
          public stacks cleared
        </div>
      )}

      <div id="how-to" className="grid gap-4">
        <button
          type="button"
          onClick={() => setIsHowToOpen((isOpen) => !isOpen)}
          className="w-fit border-2 border-[#39ff14] bg-black px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          how to
        </button>

        {isHowToOpen ? (
          <section className="border-2 border-[#39ff14] bg-black px-4 py-5 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
            <h2 className="text-2xl font-black uppercase tracking-[0.16em] text-[#39ff14]">
              how to
            </h2>
            <div className="mt-5 grid gap-3">
              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  quick start
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <li>Press join the circle.</li>
                  <li>Enter a name, create a password, and enter Bay Space as Reader.</li>
                  <li>No account type choice and no access code are needed for normal signup.</li>
                  <li>Use Conspiracy for theory material, Facts on News for Top Story and fact-based news, and the book button for Library.</li>
                  <li>The Bay Space logo is Basecamp. From the Briefing Room, it also brings you back from any options room.</li>
                </ul>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  how to log in
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <li>Find [LOG IN] at the top of the page.</li>
                  <li>Type your username or member number in the username box.</li>
                  <li>Press the spaceship or press Enter.</li>
                  <li>The same box becomes the password box. Type your password there.</li>
                  <li>Press the spaceship or Enter again to open your Briefing Room.</li>
                  <li>After login, the login bar disappears until you sign out.</li>
                </ul>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  navigation
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <li>Conspiracy opens the conspiracy board.</li>
                  <li>Facts on News opens the facts feed with Top Story controls.</li>
                  <li>The book button opens Library.</li>
                  <li>The Bay Space logo opens Basecamp / Briefing Room.</li>
                  <li>On mobile or a condensed window, the layout stacks as +CRYPTI, logo, Conspiracy and Facts, then Library.</li>
                  <li>The +CRYPTI button appears to the left of Conspiracy after the +CRYPTI gate key is owned.</li>
                </ul>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  briefing room
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <li>The ID card shows rank, title, available points, lifetime points, Bayo Coins, and points until next promotion.</li>
                  <li>The options menu opens rooms like profile, favorites, my posts, settings, and exchange.</li>
                  <li>When an option is open, the big Briefing Room header and posting tools step out of the way.</li>
                  <li>Each options room has a back button that returns to the Briefing Room.</li>
                  <li>Pressing the Bay Space logo also returns to the Briefing Room.</li>
                </ul>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  ranks and posting
                </summary>
                <div className="mt-3 grid gap-4 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <p>Everyone starts as Reader. Lifetime points move the account through the regular Bay Space ladder.</p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>Reader - can read Conspiracy and Facts on News.</li>
                    <li>Reader II - 250 lifetime points, unlocks Library reading.</li>
                    <li>Poster - 1,000 lifetime points, can post in Conspiracy.</li>
                    <li>Poster II - 3,500 lifetime points, can post in Conspiracy and Library.</li>
                    <li>Poster III - 10,000 lifetime points, can post in Conspiracy, Library, and Facts on News.</li>
                    <li>Graduation - purchased in Badge Quest for 500 Bayo Coins.</li>
                  </ul>
                </div>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  points and article reads
                </summary>
                <div className="mt-3 grid gap-4 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <p>Promotion points are shown on the ID card as available points and lifetime points.</p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>Opening an article for the first time gives +5 available points and +5 lifetime points.</li>
                    <li>Each article can only award those +5 points one time per account.</li>
                    <li>Each recorded profile page visit gives the profile owner +1 available point and +1 lifetime point.</li>
                    <li>Available points can be traded for Bayo Coins in Exchange at 100 points for 1 coin.</li>
                    <li>Lifetime points are never spent; they keep your promotion history moving forward.</li>
                  </ul>
                  <p>Post score is separate from promotion points.</p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>Post opens add +1 post point per recorded view.</li>
                    <li>Favorite diamonds received add post score and save posts to reader favorites.</li>
                    <li>Tickets and diamonds can move a post forward in the public score system.</li>
                    <li>Deleted posts lose their post score with them.</li>
                  </ul>
                </div>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  exchange and Badge Quest
                </summary>
                <div className="mt-3 grid gap-4 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <p>Exchange is available from the start inside the Briefing Room options menu.</p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>Trade available points for Bayo Coins at 100 points for 1 coin.</li>
                    <li>Open the Badge Quest dropdown to view unlocks.</li>
                    <li>Graduation costs 500 Bayo Coins and must be owned before any other Badge Quest badge or card.</li>
                    <li>Safari Nation costs 25 coins.</li>
                    <li>Bayo+ costs 100 coins.</li>
                    <li>+CRYPTI costs 250 coins and unlocks the +CRYPTI branch.</li>
                    <li>Cabbin Wizard Club costs 10,000 coins.</li>
                  </ul>
                </div>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  +CRYPTI branch
                </summary>
                <div className="mt-3 grid gap-4 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <p>After Graduation, buy the +CRYPTI gate key for 250 coins to enter the blue branch.</p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>Reader III - 100,000 lifetime points, can read +CRYPTI.</li>
                    <li>Poster IV - 175,000 lifetime points, can post in +CRYPTI.</li>
                    <li>Poster V - 300,000 lifetime points, grand highest rank.</li>
                    <li>Instant Rank Promotion I costs 150 tokens and advances +CRYPTI to Poster IV. Requires +CRYPTI ownership.</li>
                    <li>Instant Rank Promotion II costs 50 tokens and advances +CRYPTI to Poster V. Requires Instant Rank Promotion I.</li>
                    <li>Once +CRYPTI is owned, the blue +CRYPTI nav appears beside Conspiracy.</li>
                  </ul>
                </div>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  comments and truth votes
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <li>Conspiracy and Facts on News posts include comments.</li>
                  <li>The truth scale runs from 0 to 11.</li>
                  <li>Press vote to cast a truth vote.</li>
                  <li>Pressing vote again on the same score undoes your vote.</li>
                  <li>Truth scores from 2 through 9 add +1 truth point to the post.</li>
                  <li>Truth scores from 10 through 11 add +2 truth points to the post.</li>
                </ul>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  favorite diamond
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <li>Open a post and press the green diamond to save it.</li>
                  <li>Diamond posts are added to your favorites folder.</li>
                  <li>Open the Briefing Room and press favorites to view saved posts.</li>
                  <li>Favorites are grouped by Facts on News, Conspiracy, Library, and +CRYPTI when available.</li>
                </ul>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  how to make a post
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <li>Conspiracy is for theories, conspiracies, hypotheses, dreams, strange signals, and speculation.</li>
                  <li>Facts on News is for fact-based news and Top Story posts with supporting details.</li>
                  <li>Library is for longer reading material, sources, archives, and items that belong on the shelf.</li>
                  <li>Add sources when available. If it is your own idea, source yourself clearly.</li>
                  <li>Anon keeps the post public while hiding your displayed name.</li>
                  <li>Incog keeps the post out of public feeds and uses a reference path instead.</li>
                </ul>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  LA Bay-Space
                </summary>
                <div className="mt-3 grid gap-4 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <a
                    href="https://chatgpt.com/g/g-6a0c0390b6b08191991a65f1b3753fe7-lazy-assistant"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-fit border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  >
                    Create
                  </a>
                  <p>LA Bay-Space helps find and shape stories.</p>
                  <p>Ask for a Conspiracy, Facts on News, Top Story, or Library draft.</p>
                  <p>It can search, check the story, give you a numbered list, and turn the selected item into a clean post.</p>
                  <div>
                    <p>The finished draft should include:</p>
                    <ul className="mt-2 list-disc space-y-2 pl-5">
                      <li>headline</li>
                      <li>body details</li>
                      <li>source links</li>
                      <li>ready-to-paste Agent Mode format</li>
                    </ul>
                  </div>
                </div>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  conspiracy categories
                </summary>
                <div className="mt-3 grid gap-3 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <p>
                    Conspiracy posts can be filed as conspiracy, declassified,
                    dreams/visions, fact based, hypothesis, misc, occult,
                    psychic, or psychedelic/download.
                  </p>
                  <div className="grid gap-2">
                    {theoryCategories.map((category) => (
                      <div
                        key={category.label}
                        className="border border-[#1d7f12] bg-black/40 px-3 py-3"
                      >
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                          {category.label}
                        </p>
                        <p className="mt-2 text-sm font-bold leading-6 text-[#d7ffd0]">
                          {category.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  account support
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <li>Email bayoadmin@protonmail.com for account support.</li>
                  <li>For a name change, use subject line: Name Change.</li>
                  <li>For account issues, include your username or member number.</li>
                </ul>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  Delete Account
                </summary>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="border border-[#ff3b3b] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ff6b6b]"
                  >
                    Delete account
                  </button>
                  <button
                    type="button"
                    className="border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]"
                  >
                    Wipe Account
                  </button>
                </div>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <li>Open the Briefing Room from your username or member number.</li>
                  <li>Log in with your username or member number and password.</li>
                  <li>Press settings.</li>
                  <li>Scroll to Delete Account buttons at the bottom.</li>
                  <li>Press Delete account for full erase, or Wipe Account to clear posts while keeping the ID card.</li>
                  <li>Delete account erases the account and all information. Full delete. Account number is retired permanently.</li>
                  <li>Wipe Account clears all posts. ID card stays the same.</li>
                </ul>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  about
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <li>BaySpace is a new approach to social media.</li>
                  <li>It is built as a place to share news, theories, conspiracies, sources, and strange signals.</li>
                  <li>It rewards exploration first: reading, saving, voting, commenting, and eventually posting.</li>
                  <li>Follower counts and public popularity theater are not the main event here.</li>
                </ul>
              </details>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
