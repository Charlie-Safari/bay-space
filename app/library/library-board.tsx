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
        setPosts(
          savedPosts.filter(
            (post) =>
              !isCryptiPost(post) &&
              (post.category === "library-submission" || post.shelfCode),
          ),
        );
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
          return true;
        }

        return `${post.title} ${post.body} ${post.shelfLabel ?? ""}`
          .toLowerCase()
          .includes(normalizedQuery);
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
                  shelf label: {post.shelfLabel || post.title}
                </span>
                <span className="mt-2 block text-xl font-black uppercase tracking-[0.14em]">
                  {post.title}
                </span>
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
                    <CopyPostLinkButton path={`/library#library-${post.id}`} />
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
                  How to - LA Bay-Space
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
                  <p>LA Bay-Space finds stories for you.</p>
                  <p>
                    Just ask for: Daily Food, Top Story, or Conspiracy/Theory.
                  </p>
                  <p>
                    LA Bay-Space searches, checks the story, and gives you a numbered list.
                  </p>
                  <p>You pick a number.</p>
                  <div>
                    <p>Then LA Bay-Space turns it into a clean post with:</p>
                    <ul className="mt-2 list-disc space-y-2 pl-5">
                      <li>headline</li>
                      <li>body details</li>
                      <li>source links</li>
                      <li>ready-to-paste Agent Mode format</li>
                    </ul>
                  </div>
                  <p>
                    You do not need to find the article, organize the facts, or format the post.
                  </p>
                </div>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  how to log in
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <li>Find the UFO box at the top.</li>
                  <li>enter your assigned member number</li>
                  <li>spaceship = go</li>
                  <li>Pressing Enter in the member box does the same thing as tapping the spaceship.</li>
                  <li>If the member number does not exist, the password page will say no account found.</li>
                </ul>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  how to use anon vs incog
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <li>Anon keeps the post public but replaces your name with classified.</li>
                  <li>Incog keeps the post out of public feeds and uses a reference code instead.</li>
                  <li>Anon and Incog cannot be used together.</li>
                  <li>Use Anon when the post should be public but your name should not show.</li>
                  <li>Use Incog when the post should only be found through a code or private reference path.</li>
                </ul>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  favorite diamond
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <li>clicking this reveals ghost accounts profile info.</li>
                  <li>Open a post and press the green diamond to save it.</li>
                  <li>Diamond posts are automatically added to your favorites folder.</li>
                  <li>Open the briefing room and press favorites to view saved posts.</li>
                  <li>Favorites are grouped by Daily Food, Theories, and Library.</li>
                </ul>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  how to make a post
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <li>Daily Food: use fact-based supporting details. Add a different source for each supporting detail when available.</li>
                  <li>Daily Food: if the post does not have facts to support it, consider moving it to Theories.</li>
                  <li>Theories: use this for conspiracy, hypothesis, instinct, speculation, or even a dream you had.</li>
                  <li>Theories: zero evidence is acceptable, but be clear about what is theory versus fact.</li>
                  <li>Library: add reading material here when it does not fit cleanly into Daily Food or Theories.</li>
                  <li>Library: try to include sources. If it is your own idea, source yourself.</li>
                </ul>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  point structure
                </summary>
                <div className="mt-3 grid gap-4 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <p>✨ Profile score only tracks:</p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>🍽️ Daily Food post → +10</li>
                    <li>🧠 Theories post → +1</li>
                    <li>📚 Library post → +5</li>
                    <li>👤 Profile visit → +0.1</li>
                    <li>🔍 Fully opened post? 🍽️ 🧠 📚 → +0.1 post points</li>
                  </ul>
                  <p>🎁 Bonus drops:</p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>💎 Diamond received → +10</li>
                    <li>💎 Diamond removed → -10</li>
                    <li>🎟️ Ticket received → +50</li>
                    <li>🎟️ Ticket removed → -50</li>
                  </ul>
                  <p>🗑️ Deleted post? Its points disappear too: base points + visits + 💎 + 🎟️</p>
                </div>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  types of accounts
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <li>Curious Reader: read and reveal posts.</li>
                  <li>Author/influencer - Daily Food: can only post in Daily Food and Library. Anon and incog unavailable.</li>
                  <li>Author/influencer - Theories: can only post in Theories and Library. Anon and incog available.</li>
                  <li>Oracle: can post in Daily Food, Theories, and Library. Anon posts link to the user profile.</li>
                  <li>+CRYPTI: unrestricted posting access anywhere, including +CRYPTI.</li>
                </ul>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  which account is right for you?
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <li>Pick Curious Reader if you only want to read and reveal posts.</li>
                  <li>Pick Author/influencer - Daily Food if you post Daily Food and Library under your public name.</li>
                  <li>Pick Author/influencer - Theories if you post Theories and Library under your public name.</li>
                  <li>Pick Oracle if you need Daily Food, Theories, Library, and anon profile-linked posting. Access code required.</li>
                  <li>Pick +CRYPTI if you need unrestricted BAY-SPACE access plus +CRYPTI viewing and posting. Access code required.</li>
                </ul>
              </details>

              <details className="border border-[#1d7f12] bg-[#001100] px-3 py-3">
                <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                  theories
                </summary>
                <div className="mt-3 grid gap-3 text-sm font-bold leading-6 text-[#d7ffd0]">
                  <p>
                    Theories can be filed as conspiracy, declassified,
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
                  library
                </summary>
                <p className="mt-3 text-sm font-bold uppercase tracking-[0.14em] text-[#d7ffd0]">
                  coming soon
                </p>
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
                  <li>Open Daily Briefing Room from your member number.</li>
                  <li>Log in with your member number and password.</li>
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
                  <li>It is not built for hyping yourself, performing popularity, or showing off.</li>
                  <li>Here you will not find commenting, messaging, follower counts, or public like counts.</li>
                </ul>
              </details>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
