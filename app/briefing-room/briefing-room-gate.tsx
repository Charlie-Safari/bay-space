"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BayPost,
  deleteBayPost,
  getBayPosts,
  getDateKey,
  normalizeShelfLabel,
  postStoreEvent,
  saveBayPost,
} from "../components/post-store";
import {
  countFavoritePost,
  favoriteStoreEvent,
  getFavoritePostIds,
} from "../components/favorite-store";

type BriefingRoomGateProps = {
  member: string;
};

type SavedMember = {
  member: string;
  name: string;
  refName: string;
  roles: string;
  title: string;
};

type PostCategory =
  | "top-story"
  | "daily-food"
  | "theory"
  | "library-submission";

type SourceDraft = {
  id: number;
  link: string;
  connection: string;
};

type FavoriteCategory = "daily-food" | "theory" | "library-submission";

function getMemberKey(memberId: string) {
  return `bay-space-circle-member-v6-${memberId}`;
}

const activeMemberKey = "bay-space-active-member-v6";

const postCategories: { id: PostCategory; label: string }[] = [
  { id: "top-story", label: "Top Story" },
  { id: "daily-food", label: "Daily food" },
  { id: "theory", label: "Theory" },
  { id: "library-submission", label: "Library submission" },
];

const creatorRoles = [
  "creator/ influencer - news",
  "creator/ influencer - conspiracy",
];

const ghostRoles = ["ghost author - news", "ghost author - conspiracy"];

function getSelectedRoles(member: SavedMember | null) {
  return member?.roles
    .split(",")
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean) ?? [];
}

function hasCreatorPostingAccess(member: SavedMember | null) {
  const selectedRoles = getSelectedRoles(member);

  return selectedRoles.some((role) => creatorRoles.includes(role));
}

function hasGhostPostingAccess(member: SavedMember | null) {
  const selectedRoles = getSelectedRoles(member);

  return selectedRoles.some((role) => ghostRoles.includes(role));
}

function getAccountMarker(member: SavedMember | null) {
  const selectedRole = getSelectedRoles(member)[0] ?? "";

  if (selectedRole === "curious reader") {
    return "CR";
  }

  if (selectedRole === "ghost author - news") {
    return "CA-N";
  }

  if (selectedRole === "ghost author - conspiracy") {
    return "CA-C";
  }

  if (selectedRole === "creator/ influencer - news") {
    return "CI-N";
  }

  if (selectedRole === "creator/ influencer - conspiracy") {
    return "CI-C";
  }

  return "";
}

function getSavedMember(memberId: string): SavedMember | null {
  const savedMember = window.localStorage.getItem(getMemberKey(memberId));

  if (!savedMember) {
    return null;
  }

  try {
    return JSON.parse(savedMember) as SavedMember;
  } catch {
    return null;
  }
}

function cacheSavedMember(member: SavedMember) {
  window.localStorage.setItem(getMemberKey(member.member), JSON.stringify(member));
}

async function fetchSavedMember(memberId: string): Promise<SavedMember | null> {
  const cachedMember = getSavedMember(memberId);

  if (cachedMember) {
    return cachedMember;
  }

  const response = await fetch(`/api/members/${memberId}`, { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { member?: SavedMember };

  if (data.member) {
    cacheSavedMember(data.member);
  }

  return data.member ?? null;
}

function expandTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function formatDailyFoodCode(dateKey: string, order: number) {
  return `DF ${dateKey.replaceAll("-", "")} #${order
    .toString()
    .padStart(4, "0")}`;
}

export default function BriefingRoomGate({ member }: BriefingRoomGateProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [resolvedMember, setResolvedMember] = useState(member);
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activePanel, setActivePanel] = useState("id-card");
  const [savedMember, setSavedMember] = useState<SavedMember | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [allPosts, setAllPosts] = useState<BayPost[]>([]);
  const [myPosts, setMyPosts] = useState<BayPost[]>([]);
  const [favoritePostIds, setFavoritePostIds] = useState<string[]>([]);
  const [activeFavoriteCategory, setActiveFavoriteCategory] =
    useState<FavoriteCategory | "">("");
  const [postPreview, setPostPreview] = useState<Omit<
    BayPost,
    "id" | "createdAt" | "dateKey"
  > | null>(null);
  const [previewWarning, setPreviewWarning] = useState(false);
  const [deletePostId, setDeletePostId] = useState("");
  const [isWipeAllOpen, setIsWipeAllOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChangeMessage, setPasswordChangeMessage] = useState("");
  const [postCategory, setPostCategory] = useState<PostCategory>("top-story");
  const [topStoryStep, setTopStoryStep] = useState(1);
  const [ticker, setTicker] = useState("");
  const [report, setReport] = useState("");
  const [sources, setSources] = useState("");
  const [sourceDrafts, setSourceDrafts] = useState<SourceDraft[]>([]);
  const [dailyFoodHeadline, setDailyFoodHeadline] = useState("");
  const [dailyFoodTag1, setDailyFoodTag1] = useState("");
  const [dailyFoodSource1, setDailyFoodSource1] = useState("");
  const [dailyFoodSourceOpen1, setDailyFoodSourceOpen1] = useState(false);
  const [dailyFoodTag2, setDailyFoodTag2] = useState("");
  const [dailyFoodSource2, setDailyFoodSource2] = useState("");
  const [dailyFoodSourceOpen2, setDailyFoodSourceOpen2] = useState(false);
  const [dailyFoodTag3, setDailyFoodTag3] = useState("");
  const [dailyFoodSource3, setDailyFoodSource3] = useState("");
  const [dailyFoodSourceOpen3, setDailyFoodSourceOpen3] = useState(false);
  const [theoryPost, setTheoryPost] = useState("");
  const [theorySource, setTheorySource] = useState("");
  const [libraryTitle, setLibraryTitle] = useState("");
  const [librarySubmission, setLibrarySubmission] = useState("");
  const [postAnonymously, setPostAnonymously] = useState(false);
  const [postIncognito, setPostIncognito] = useState(false);
  const [incognitoShelfLabel, setIncognitoShelfLabel] = useState("");
  const [isIncognitoShelfSet, setIsIncognitoShelfSet] = useState(false);
  const canCreateTopStoryPosts = hasCreatorPostingAccess(savedMember);
  const canCreatePosts =
    canCreateTopStoryPosts || hasGhostPostingAccess(savedMember);
  const availablePostCategories = canCreateTopStoryPosts
    ? postCategories
    : postCategories.filter((category) => category.id !== "top-story");
  const accountMarker = getAccountMarker(savedMember);

  useEffect(() => {
    async function syncActiveMember() {
      const activeMember = window.localStorage.getItem(activeMemberKey);
      const activeSavedMember = activeMember
        ? await fetchSavedMember(activeMember)
        : null;

      if (activeMember && activeSavedMember) {
        setResolvedMember(activeMember);
        setSavedMember(activeSavedMember);
        setIsUnlocked(true);
        setErrorMessage("");
        return;
      }

      if (activeMember && !activeSavedMember) {
        window.localStorage.removeItem(activeMemberKey);
      }

      setResolvedMember(member);
      setSavedMember(await fetchSavedMember(member));
      setIsUnlocked(false);
    }

    syncActiveMember();
    window.addEventListener("storage", syncActiveMember);
    window.addEventListener("bay-space-auth", syncActiveMember);

    return () => {
      window.removeEventListener("storage", syncActiveMember);
      window.removeEventListener("bay-space-auth", syncActiveMember);
    };
  }, [member]);

  useEffect(() => {
    function syncMyPosts() {
      getBayPosts().then((savedPosts) => {
        setAllPosts(savedPosts);
        setMyPosts(
          savedPosts.filter(
            (post) => !post.anonymous && post.author === resolvedMember,
          ),
        );
      });
    }

    syncMyPosts();
    window.addEventListener("storage", syncMyPosts);
    window.addEventListener(postStoreEvent, syncMyPosts);

    return () => {
      window.removeEventListener("storage", syncMyPosts);
      window.removeEventListener(postStoreEvent, syncMyPosts);
    };
  }, [resolvedMember]);

  useEffect(() => {
    function syncFavorites() {
      setFavoritePostIds(getFavoritePostIds(resolvedMember));
    }

    syncFavorites();
    window.addEventListener("storage", syncFavorites);
    window.addEventListener(favoriteStoreEvent, syncFavorites);

    return () => {
      window.removeEventListener("storage", syncFavorites);
      window.removeEventListener(favoriteStoreEvent, syncFavorites);
    };
  }, [resolvedMember]);

  useEffect(() => {
    if (!postPreview) {
      return;
    }

    function warnPreview(event: MouseEvent | PointerEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        previewRef.current &&
        !previewRef.current.contains(target)
      ) {
        event.preventDefault();
        event.stopPropagation();
        setPreviewWarning(false);
        window.requestAnimationFrame(() => setPreviewWarning(true));
      }
    }

    window.addEventListener("pointerdown", warnPreview, true);
    window.addEventListener("click", warnPreview, true);

    return () => {
      window.removeEventListener("pointerdown", warnPreview, true);
      window.removeEventListener("click", warnPreview, true);
    };
  }, [postPreview]);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ member: resolvedMember, pin: password }),
    });
    const data = (await response.json()) as { member?: SavedMember };

    if (response.ok && data.member) {
      cacheSavedMember(data.member);
      setSavedMember(data.member);
      window.localStorage.setItem(activeMemberKey, resolvedMember);
      window.dispatchEvent(new Event("bay-space-auth"));
      setErrorMessage("");
      setIsUnlocked(true);
      return;
    }

    setErrorMessage(response.status === 401 ? "try again" : "no account found");
  }

  function signOut() {
    window.localStorage.removeItem(activeMemberKey);
    window.dispatchEvent(new Event("bay-space-auth"));
    setIsUnlocked(false);
    setPassword("");
    setIsPostOpen(false);
    setActivePanel("id-card");
    setIsChangingPassword(false);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordChangeMessage("");
  }

  function openPostWindow() {
    if (!canCreatePosts) {
      return;
    }

    if (!canCreateTopStoryPosts && postCategory === "top-story") {
      setPostCategory("daily-food");
    }

    setIsPostOpen(true);
    setActivePanel("post");
    setDeletePostId("");
  }

  function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreatePosts || (!canCreateTopStoryPosts && postCategory === "top-story")) {
      return;
    }

    setPostPreview(buildCurrentPost());
  }

  function buildCurrentPost(): Omit<BayPost, "id" | "createdAt" | "dateKey"> {
    const author = postAnonymously ? "anon" : resolvedMember || "unknown";

    if (postCategory === "top-story") {
      return {
        category: "top-story",
        title: ticker || "untitled top story",
        body: report,
        anonymous: postAnonymously,
        incognito: postIncognito,
        author,
        shelfLabel: postIncognito ? incognitoShelfLabel : undefined,
        shelfCode: postIncognito
          ? normalizeShelfLabel(incognitoShelfLabel)
          : undefined,
        meta: {
          accountMarker,
          sourceNote: sources,
          sourceLinks: sourceDrafts
            .map((source) => source.link)
            .filter(Boolean),
          sourceConnections: sourceDrafts
            .map((source) => source.connection)
            .filter(Boolean),
        },
      };
    }

    if (postCategory === "daily-food") {
      const dateKey = getDateKey();
      const dailyFoodOrder =
        allPosts.filter(
          (post) => post.category === "daily-food" && post.dateKey === dateKey,
        ).length + 1;

      return {
        category: "daily-food",
        title: dailyFoodHeadline || "untitled daily food",
        body: [dailyFoodTag1, dailyFoodTag2, dailyFoodTag3]
          .filter(Boolean)
          .join("\n"),
        anonymous: postAnonymously,
        incognito: postIncognito,
        author,
        shelfLabel: postIncognito ? incognitoShelfLabel : undefined,
        shelfCode: postIncognito
          ? normalizeShelfLabel(incognitoShelfLabel)
          : undefined,
        meta: {
          accountMarker,
          tags: [dailyFoodTag1, dailyFoodTag2, dailyFoodTag3],
          tagSources: [
            dailyFoodSource1,
            dailyFoodSource2,
            dailyFoodSource3,
          ],
          dailyFoodCode: formatDailyFoodCode(dateKey, dailyFoodOrder),
          dailyFoodOrder: dailyFoodOrder.toString(),
          sources: [
            dailyFoodSource1,
            dailyFoodSource2,
            dailyFoodSource3,
          ].filter(Boolean),
        },
      };
    }

    if (postCategory === "theory") {
      return {
        category: "theory",
        title: theoryPost.slice(0, 80) || "untitled theory",
        body: theoryPost,
        anonymous: postAnonymously,
        incognito: postIncognito,
        author,
        shelfLabel: postIncognito ? incognitoShelfLabel : undefined,
        shelfCode: postIncognito
          ? normalizeShelfLabel(incognitoShelfLabel)
          : undefined,
        meta: {
          accountMarker,
          source: theorySource,
        },
      };
    }

    return {
      category: "library-submission",
      title: libraryTitle || "untitled shelf",
      body: librarySubmission,
      anonymous: postAnonymously,
      incognito: postIncognito,
      author,
      shelfLabel: libraryTitle,
      shelfCode: normalizeShelfLabel(libraryTitle),
      meta: {
        accountMarker,
      },
    };
  }

  async function confirmPost() {
    if (
      postPreview &&
      canCreatePosts &&
      (canCreateTopStoryPosts || postPreview.category !== "top-story")
    ) {
      await saveBayPost(postPreview);
    }

    resetPostDraft();
  }

  async function wipeAllPosts() {
    await Promise.all(
      myPosts.map((post) => deleteBayPost(post.id, resolvedMember)),
    );
    setDeletePostId("");
    setIsWipeAllOpen(false);
  }

  function editPost() {
    setPostPreview(null);
    setPreviewWarning(false);
  }

  function resetPostDraft() {
    setIsPostOpen(false);
    setActivePanel("id-card");
    setPostCategory(canCreateTopStoryPosts ? "top-story" : "daily-food");
    setTopStoryStep(1);
    setTicker("");
    setReport("");
    setSources("");
    setSourceDrafts([]);
    setDailyFoodHeadline("");
    setDailyFoodTag1("");
    setDailyFoodSource1("");
    setDailyFoodSourceOpen1(false);
    setDailyFoodTag2("");
    setDailyFoodSource2("");
    setDailyFoodSourceOpen2(false);
    setDailyFoodTag3("");
    setDailyFoodSource3("");
    setDailyFoodSourceOpen3(false);
    setTheoryPost("");
    setTheorySource("");
    setLibraryTitle("");
    setLibrarySubmission("");
    setPostAnonymously(false);
    setPostIncognito(false);
    setIncognitoShelfLabel("");
    setIsIncognitoShelfSet(false);
    setPostPreview(null);
    setPreviewWarning(false);
    setDeletePostId("");
  }

  function addSourceDraft() {
    setSourceDrafts((drafts) => [
      ...drafts,
      { id: Date.now(), link: "", connection: "" },
    ]);
  }

  function updateSourceDraft(
    id: number,
    field: "link" | "connection",
    value: string,
  ) {
    setSourceDrafts((drafts) =>
      drafts.map((draft) =>
        draft.id === id ? { ...draft, [field]: value } : draft,
      ),
    );
  }

  async function changePassword() {
    if (!savedMember) {
      setPasswordChangeMessage("no account found");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setPasswordChangeMessage("fill both boxes");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeMessage("passwords do not match");
      return;
    }

    const response = await fetch(`/api/members/${resolvedMember}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin: newPassword }),
    });
    const data = (await response.json()) as { member?: SavedMember };

    if (!response.ok || !data.member) {
      setPasswordChangeMessage("password not changed");
      return;
    }

    cacheSavedMember(data.member);
    setSavedMember(data.member);
    setPassword(newPassword);
    setNewPassword("");
    setConfirmPassword("");
    setIsChangingPassword(false);
    setPasswordChangeMessage("password changed");
  }

  function cancelPasswordChange() {
    setIsChangingPassword(false);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordChangeMessage("");
  }

  function getPostHref(post: BayPost) {
    if (post.category === "top-story") {
      return `/news/post?id=${post.id}`;
    }

    if (post.category === "daily-food") {
      if (post.incognito && post.shelfCode) {
        return "/daily-food";
      }

      return `/daily-food#post-${post.id}`;
    }

    if (post.category === "theory") {
      return `/theories#post-${post.id}`;
    }

    return `/library#library-${post.id}`;
  }

  function getPostSources(post: Pick<BayPost, "meta">) {
    const sourceLinks = post.meta?.sourceLinks;
    const sources = post.meta?.sources;
    const theorySource = post.meta?.source;

    return [
      ...(Array.isArray(sourceLinks) ? sourceLinks : []),
      ...(Array.isArray(sources) ? sources : []),
      ...(typeof theorySource === "string" && theorySource
        ? [theorySource]
        : []),
    ];
  }

  function getSourceHref(source: string) {
    return source.startsWith("http://") || source.startsWith("https://")
      ? source
      : `https://${source}`;
  }

  function getFavoritePosts(category: FavoriteCategory) {
    const favoritePosts = allPosts.filter((post) => {
      if (!favoritePostIds.includes(post.id)) {
        return false;
      }

      if (category === "library-submission") {
        return post.category === "library-submission" || Boolean(post.shelfCode);
      }

      return post.category === category;
    });

    if (category === "library-submission") {
      return favoritePosts.sort((leftPost, rightPost) =>
        leftPost.title.localeCompare(rightPost.title),
      );
    }

    return favoritePosts.sort(
      (leftPost, rightPost) =>
        new Date(rightPost.createdAt).getTime() -
        new Date(leftPost.createdAt).getTime(),
    );
  }

  const header = (
    <div className="w-full max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          briefing room
        </h1>
        {isUnlocked && canCreatePosts ? (
          <button
            type="button"
            onClick={openPostWindow}
            className="w-fit border-2 border-[#39ff14] bg-[#031403] px-5 py-3 text-sm font-black uppercase tracking-[0.24em] text-[#39ff14] shadow-[0_0_14px_rgba(57,255,20,0.28)] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            new post
          </button>
        ) : null}
      </div>
      {isUnlocked && canCreatePosts ? (
        <div className="mt-6 flex flex-wrap items-end gap-2">
          {isPostOpen ? (
            <button
              type="button"
              onClick={() => setActivePanel("post")}
              className={`border-2 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] ${
                activePanel === "post"
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              post # - [open]
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (isUnlocked) {
    return (
      <>
        {header}
        <div className="mt-10 grid w-full max-w-4xl gap-6 md:grid-cols-[220px_1fr]">
        <aside className="border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
            options
          </p>
          <div className="mt-4 grid gap-3 text-sm font-black uppercase tracking-[0.12em] text-[#39ff14]">
            <button
              onClick={() => setActivePanel("id-card")}
              className={`border px-3 py-2 text-left ${
                activePanel === "id-card"
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              ID card
            </button>
            <button
              onClick={() => {
                setActivePanel("my-posts");
                setDeletePostId("");
              }}
              className={`border px-3 py-2 text-left transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_12px_rgba(57,255,20,0.35)] ${
                activePanel === "my-posts"
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              my posts
            </button>
            <button
              onClick={() => {
                setActivePanel("favorites");
                setActiveFavoriteCategory("");
              }}
              className={`border px-3 py-2 text-left transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_12px_rgba(57,255,20,0.35)] ${
                activePanel === "favorites"
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              favorites
            </button>
            <Link
              href={`/profile/${resolvedMember}`}
              className="border border-[#1d7f12] px-3 py-2 text-left transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_12px_rgba(57,255,20,0.35)]"
            >
              profile
            </Link>
            <button
              onClick={signOut}
              className="border border-[#ff3b3b] px-3 py-2 text-left text-[#ff6b6b]"
            >
              sign out
            </button>
          </div>
        </aside>
        <section className="border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
          {activePanel === "post" && isPostOpen ? (
            postPreview ? (
              <div
                ref={previewRef}
                onAnimationEnd={() => setPreviewWarning(false)}
                className={
                  previewWarning ? "animate-[option-shake_180ms_linear]" : ""
                }
              >
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                  preview
                </p>
                <article className="mt-5 border-2 border-[#1d7f12] px-4 py-4">
                  {postPreview.category === "daily-food" &&
                  typeof postPreview.meta?.dailyFoodOrder === "string" ? (
                    <p className="float-right text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                      {typeof postPreview.meta.accountMarker === "string" &&
                      postPreview.meta.accountMarker
                        ? `${postPreview.meta.accountMarker} `
                        : ""}
                      #{postPreview.meta.dailyFoodOrder}
                    </p>
                  ) : null}
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                    {postPreview.category.replace("-", " ")}
                  </p>
                  {(postPreview.anonymous || savedMember?.name) ? (
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                      {postPreview.anonymous ? "classified" : savedMember?.name}
                    </p>
                  ) : null}
                  {typeof postPreview.meta?.dailyFoodCode === "string" ? (
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                      {postPreview.meta.dailyFoodCode}
                    </p>
                  ) : null}
                  <h2 className="mt-3 text-xl font-black uppercase tracking-[0.12em] text-[#39ff14]">
                    {postPreview.title}
                  </h2>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#d7ffd0]">
                    {postPreview.body || "no body entered"}
                  </p>
                  {getPostSources(postPreview).length ? (
                    <div className="mt-5 border-t border-[#1d7f12] pt-3">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7f9f78]">
                        SOURCES
                      </p>
                      <div className="mt-2 grid gap-2 text-xs">
                        {getPostSources(postPreview).map((source) => (
                          <a
                            key={source}
                            href={getSourceHref(source)}
                            className="break-all text-[#d7ffd0] underline decoration-[#39ff14] underline-offset-4"
                          >
                            {source}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={confirmPost}
                    className={`border-2 border-[#39ff14] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
                      previewWarning
                        ? "animate-[preview-confirm-flash_500ms_ease-in-out_2]"
                        : ""
                    }`}
                  >
                    confirm
                  </button>
                  <button
                    type="button"
                    onClick={editPost}
                    className="border border-[#1d7f12] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  >
                    edit
                  </button>
                  {postPreview.shelfCode ? (
                    <p className="border border-[#1d7f12] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                      reference code :{" "}
                      <span className="text-[#39ff14]">
                        {postPreview.shelfCode}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <form onSubmit={submitPost}>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                post window
              </p>
              <fieldset className="mt-5 grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Choose post type</legend>
                {availablePostCategories.map((category) => (
                  <label
                    key={category.id}
                    className={`relative flex items-center gap-5 overflow-visible border bg-black px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0] transition ${
                      postCategory === category.id
                        ? "border-[#39ff14] shadow-[0_0_18px_rgba(57,255,20,0.42)]"
                        : "border-[#1d7f12]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="post-category"
                      checked={postCategory === category.id}
                      onChange={() => {
                        setPostCategory(category.id);
                        setTopStoryStep(1);
                      }}
                      className="peer sr-only"
                    />
                    <span
                      className="relative z-10 block h-4 w-4 shrink-0 rounded-full border border-[#d7ffd0] bg-[#f8fff7] shadow-[0_0_7px_rgba(255,255,255,0.45)] peer-checked:border-[#39ff14] peer-checked:bg-[#39ff14] peer-checked:shadow-[0_0_10px_rgba(57,255,20,0.65)] after:absolute after:left-1/2 after:top-1/2 after:hidden after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-[#d7ffd0] peer-checked:after:block"
                      aria-hidden="true"
                    />
                    <span className="relative z-0">{category.label}</span>
                  </label>
                ))}
              </fieldset>

              {postCategory === "top-story" ? (
                <div className="mt-6 grid gap-5">
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      scrolling ticker{" "}
                      <span className="text-xs text-[#7f9f78]">
                        ({100 - ticker.length})
                      </span>
                    </span>
                    <textarea
                      value={ticker}
                      onChange={(event) =>
                        setTicker(event.target.value.slice(0, 100))
                      }
                      onInput={(event) => expandTextarea(event.currentTarget)}
                      rows={1}
                      className="min-h-[3rem] w-full resize-none overflow-hidden border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                  {topStoryStep < 2 ? (
                    <button
                      type="button"
                      onClick={() => setTopStoryStep(2)}
                      className="w-fit border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                    >
                      next
                    </button>
                  ) : null}

                  {topStoryStep >= 2 ? (
                    <>
                      <label className="grid gap-2">
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                          Report:{" "}
                          <span className="text-xs text-[#7f9f78]">
                            ({1200 - report.length})
                          </span>
                        </span>
                        <textarea
                          value={report}
                          onChange={(event) =>
                            setReport(event.target.value.slice(0, 1200))
                          }
                          onInput={(event) => expandTextarea(event.currentTarget)}
                          rows={1}
                          className="min-h-[3rem] w-full resize-none overflow-hidden border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                        />
                      </label>
                      {topStoryStep < 3 ? (
                        <button
                          type="button"
                          onClick={() => setTopStoryStep(3)}
                          className="w-fit border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                        >
                          next
                        </button>
                      ) : null}
                    </>
                  ) : null}

                  {topStoryStep >= 3 ? (
                    <div className="grid gap-4">
                      <label className="grid gap-2">
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                          source notes
                        </span>
                        <span className="text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
                          optional source notes connecting article
                        </span>
                        <select
                          value={sources}
                          onChange={(event) => setSources(event.target.value)}
                          className="min-h-[3rem] w-full border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                        >
                          <option value="">select source note</option>
                          <option value="primary source">primary source</option>
                          <option value="context source">context source</option>
                          <option value="supporting source">
                            supporting source
                          </option>
                          <option value="source connection unclear">
                            source connection unclear
                          </option>
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={addSourceDraft}
                        className="w-fit border border-[#39ff14] px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                      >
                        Add source
                      </button>
                      {sourceDrafts.map((source) => (
                        <div
                          key={source.id}
                          className="grid gap-3 sm:grid-cols-2"
                        >
                          <input
                            value={source.link}
                            onChange={(event) =>
                              updateSourceDraft(
                                source.id,
                                "link",
                                event.target.value,
                              )
                            }
                            placeholder="[link]"
                            className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none placeholder:font-normal placeholder:italic placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                          />
                          <input
                            value={source.connection}
                            onChange={(event) =>
                              updateSourceDraft(
                                source.id,
                                "connection",
                                event.target.value,
                              )
                            }
                            placeholder="[connection to article]"
                            className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none placeholder:font-normal placeholder:italic placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {postCategory === "daily-food" ? (
                <div className="mt-6 grid gap-5">
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      rolling headline{" "}
                      <span className="text-xs text-[#7f9f78]">
                        ({75 - dailyFoodHeadline.length})
                      </span>
                    </span>
                    <textarea
                      value={dailyFoodHeadline}
                      onChange={(event) =>
                        setDailyFoodHeadline(event.target.value.slice(0, 75))
                      }
                      onInput={(event) => expandTextarea(event.currentTarget)}
                      rows={1}
                      className="min-h-[3rem] w-full resize-none overflow-hidden border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>

                  {[
                    {
                      label: "tag 1",
                      value: dailyFoodTag1,
                      setValue: setDailyFoodTag1,
                      source: dailyFoodSource1,
                      setSource: setDailyFoodSource1,
                      sourceOpen: dailyFoodSourceOpen1,
                      setSourceOpen: setDailyFoodSourceOpen1,
                    },
                    {
                      label: "tag 2",
                      value: dailyFoodTag2,
                      setValue: setDailyFoodTag2,
                      source: dailyFoodSource2,
                      setSource: setDailyFoodSource2,
                      sourceOpen: dailyFoodSourceOpen2,
                      setSourceOpen: setDailyFoodSourceOpen2,
                    },
                    {
                      label: "tag 3",
                      value: dailyFoodTag3,
                      setValue: setDailyFoodTag3,
                      source: dailyFoodSource3,
                      setSource: setDailyFoodSource3,
                      sourceOpen: dailyFoodSourceOpen3,
                      setSourceOpen: setDailyFoodSourceOpen3,
                    },
                  ].map((tag) => (
                    <div key={tag.label} className="grid gap-3">
                      <label className="grid gap-2">
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                          {tag.label}{" "}
                          <span className="text-xs text-[#7f9f78]">
                            ({150 - tag.value.length})
                          </span>
                        </span>
                        <textarea
                          value={tag.value}
                          onChange={(event) =>
                            tag.setValue(event.target.value.slice(0, 150))
                          }
                          onInput={(event) => expandTextarea(event.currentTarget)}
                          rows={1}
                          className="min-h-[3rem] w-full resize-none overflow-hidden border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                        />
                      </label>
                      {tag.sourceOpen ? (
                        <label className="grid gap-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                            Source - link
                          </span>
                          <input
                            value={tag.source}
                            onChange={(event) =>
                              tag.setSource(event.target.value)
                            }
                            className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                          />
                        </label>
                      ) : (
                        <button
                          type="button"
                          onClick={() => tag.setSourceOpen(true)}
                          className="w-fit border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
                        >
                          add source
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              {postCategory === "theory" ? (
                <div className="mt-6 grid gap-5">
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      anything{" "}
                      <span className="text-xs text-[#7f9f78]">
                        ({10000 - theoryPost.length})
                      </span>
                    </span>
                    <textarea
                      value={theoryPost}
                      onChange={(event) =>
                        setTheoryPost(event.target.value.slice(0, 10000))
                      }
                      onInput={(event) => expandTextarea(event.currentTarget)}
                      rows={1}
                      className="min-h-[3rem] w-full resize-none overflow-hidden border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      Source:
                    </span>
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
                      optional
                    </span>
                    <input
                      value={theorySource}
                      onChange={(event) => setTheorySource(event.target.value)}
                      placeholder="source? what source? eht hem"
                      className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none placeholder:font-normal placeholder:italic placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                </div>
              ) : null}

              {postCategory === "library-submission" ? (
                <div className="mt-6 grid gap-5">
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      shelf label{" "}
                      <span className="text-xs text-[#7f9f78]">
                        ({120 - libraryTitle.length})
                      </span>
                    </span>
                    <input
                      value={libraryTitle}
                      onChange={(event) =>
                        setLibraryTitle(event.target.value.slice(0, 120))
                      }
                      className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      library submission
                    </span>
                    <textarea
                      value={librarySubmission}
                      onChange={(event) =>
                        setLibrarySubmission(event.target.value)
                      }
                      onInput={(event) => expandTextarea(event.currentTarget)}
                      rows={1}
                      className="min-h-[3rem] w-full resize-none overflow-hidden border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    className="w-fit border-2 border-[#39ff14] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                  >
                    Submit to the ether
                  </button>
                  <div className="grid gap-2">
                    <label className="flex items-center gap-3 border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#d7ffd0]">
                      <input
                        type="checkbox"
                        checked={postAnonymously}
                        onChange={(event) => {
                          setPostAnonymously(event.target.checked);

                          if (event.target.checked) {
                            setPostIncognito(false);
                          }
                        }}
                        className="h-4 w-4 accent-[#39ff14]"
                      />
                      Anon
                      <span className="text-[0.65rem] tracking-[0.12em] text-[#7f9f78]">
                        name will be classified
                      </span>
                    </label>
                    <label className="flex items-center gap-3 border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#d7ffd0]">
                      <input
                        type="checkbox"
                        checked={postIncognito}
                        onChange={(event) => {
                          setPostIncognito(event.target.checked);

                          if (event.target.checked) {
                            setPostAnonymously(false);
                          }
                        }}
                        className="h-4 w-4 accent-[#39ff14]"
                      />
                      Incog
                      <span className="text-[0.65rem] tracking-[0.12em] text-[#7f9f78]">
                        wont show up on public page
                      </span>
                    </label>
                    {postIncognito ? (
                      <div className="border border-[#1d7f12] px-3 py-2">
                        {isIncognitoShelfSet ? (
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                            reference code :{" "}
                            {normalizeShelfLabel(incognitoShelfLabel) || "---"}
                          </p>
                        ) : (
                          <div className="grid gap-2">
                            <label className="grid gap-2">
                              <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                                reference code
                              </span>
                              <input
                                value={incognitoShelfLabel}
                                onChange={(event) =>
                                  setIncognitoShelfLabel(
                                    event.target.value.slice(0, 120),
                                  )
                                }
                                className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsIncognitoShelfSet(true)}
                              className="w-fit border border-[#39ff14] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black"
                            >
                              set
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={resetPostDraft}
                className="mt-4 w-fit self-end border border-[#ff3b3b] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
              >
                wipe
              </button>
              </form>
            )
          ) : activePanel === "my-posts" ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                my posts
              </p>
              {myPosts.length ? (
                <button
                  type="button"
                  onClick={() => setIsWipeAllOpen(true)}
                  className="mt-4 border border-[#ff3b3b] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
                >
                  wipe all
                </button>
              ) : null}
              {isWipeAllOpen ? (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Confirm wipe all posts"
                  className="mt-5 border-2 border-[#39ff14] bg-[#001100] p-4 shadow-[0_0_18px_rgba(57,255,20,0.22)]"
                >
                  <p className="dos-type-command w-fit overflow-hidden whitespace-nowrap text-xs font-black uppercase tracking-[0.18em] text-[#39ff14]">
                    comfirm command; wipe all?
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setIsWipeAllOpen(false)}
                      className="border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                    >
                      cancel
                    </button>
                    <button
                      type="button"
                      onClick={wipeAllPosts}
                      className="border border-[#ff3b3b] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
                    >
                      confirm
                    </button>
                  </div>
                </div>
              ) : null}
              {myPosts.length ? (
                <div className="mt-5 grid gap-3">
                  {myPosts.map((post) => (
                    <div
                      key={post.id}
                      className="relative border border-[#1d7f12] px-3 py-3"
                    >
                      <button
                        type="button"
                        onClick={() => setDeletePostId(post.id)}
                        className="absolute right-2 top-2 border border-[#ff3b3b] px-2 py-0.5 text-xs font-black uppercase tracking-[0.08em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black"
                        aria-label={`Delete ${post.title}`}
                      >
                        x
                      </button>
                      <span className="absolute right-3 top-9 text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#39ff14]">
                        {countFavoritePost(post.id)}
                      </span>
                      <a
                        href={getPostHref(post)}
                        className="block pr-10 transition hover:text-[#d7ffd0] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                      >
                        <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                          {post.category.replace("-", " ")}
                        </span>
                        <span className="mt-2 block text-sm font-black uppercase tracking-[0.14em]">
                          {post.title}
                        </span>
                        {post.incognito && post.shelfCode ? (
                          <span className="mt-2 block text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                            reference code : {post.shelfCode}
                          </span>
                        ) : null}
                      </a>
                      {deletePostId === post.id ? (
                        <div className="mt-3 border-t border-[#1d7f12] pt-3">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                            confirm wipe?
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteBayPost(post.id, resolvedMember);
                                setDeletePostId("");
                              }}
                              className="border border-[#ff3b3b] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black"
                            >
                              wipe
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletePostId("")}
                              className="border border-[#1d7f12] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
                            >
                              keep
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 border-l-2 border-[#39ff14] pl-4 text-sm font-bold uppercase tracking-[0.14em] text-[#d7ffd0]">
                  no posts filed yet
                </p>
              )}
            </div>
          ) : activePanel === "favorites" ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                favorites
              </p>
              {!activeFavoriteCategory ? (
                <div className="mt-5 grid gap-3">
                  {[
                    { id: "daily-food", label: "Daily Food" },
                    { id: "theory", label: "Theories" },
                    { id: "library-submission", label: "Library" },
                  ].map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() =>
                        setActiveFavoriteCategory(
                          category.id as FavoriteCategory,
                        )
                      }
                      className="border border-[#1d7f12] px-3 py-3 text-left text-sm font-black uppercase tracking-[0.14em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => setActiveFavoriteCategory("")}
                    className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
                  >
                    back
                  </button>
                  {getFavoritePosts(activeFavoriteCategory).length ? (
                    <div className="mt-5 grid gap-3">
                      {getFavoritePosts(activeFavoriteCategory).map((post) => (
                        <a
                          key={post.id}
                          href={getPostHref(post)}
                          className="block border border-dashed border-[#1d7f12]/70 bg-black px-3 py-3 text-[#d7ffd0] transition hover:border-[#39ff14] hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                        >
                          <span className="block text-xs uppercase tracking-[0.14em] text-[#7f9f78]">
                            {new Date(post.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </span>
                          <span className="mt-2 block text-sm font-bold">
                            {post.title}
                          </span>
                          <span className="mt-2 block whitespace-pre-wrap text-sm leading-6">
                            {post.body}
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-5 border-l-2 border-[#39ff14] pl-4 text-sm font-bold uppercase tracking-[0.14em] text-[#d7ffd0]">
                      no favorites filed yet
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : activePanel === "id-card" && savedMember ? (
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                EXPLORER NUMBER - #{savedMember.member}
              </p>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                TITLE: {savedMember.title}
              </p>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                NAME: {savedMember.name}
              </p>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                PASSWORD: CLASSIFIED
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword((isChanging) => !isChanging);
                  setPasswordChangeMessage("");
                }}
                className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] underline decoration-[#39ff14] underline-offset-4"
              >
                change password
              </button>
              {isChangingPassword ? (
                <div className="mt-4 grid max-w-md gap-3">
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                      new password
                    </span>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value.slice(0, 24));
                        setPasswordChangeMessage("");
                      }}
                      className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black tracking-[0.12em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
                      confirm password
                    </span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value.slice(0, 24));
                        setPasswordChangeMessage("");
                      }}
                      className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black tracking-[0.12em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={changePassword}
                      className="border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                    >
                      save password
                    </button>
                    <button
                      type="button"
                      onClick={cancelPasswordChange}
                      className="border border-[#1d7f12] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                    >
                      cancel
                    </button>
                  </div>
                </div>
              ) : null}
              {passwordChangeMessage ? (
                <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14]">
                  {passwordChangeMessage}
                </p>
              ) : null}
              <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                (REFERENCE NAME): {savedMember.refName || "-----"}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                member {resolvedMember || "---"}
              </p>
              <p className="mt-6 border-l-2 border-[#39ff14] pl-4 text-base leading-7 text-[#d7ffd0]">
                briefing room area online. options will be expanded soon.
              </p>
            </>
          )}
        </section>
      </div>
      </>
    );
  }

  return (
    <>
      {header}
      <form
        onSubmit={unlock}
        className="mt-10 w-full max-w-md border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]"
        aria-label="Enter briefing room password"
      >
        <label
          htmlFor="briefing-password"
          className="mb-3 block text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]"
        >
          enter password
        </label>
        <input
          id="briefing-password"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value.slice(0, 24));
            setErrorMessage("");
          }}
          className="w-full border border-[#1d7f12] bg-[#001100] px-3 py-3 text-2xl font-black tracking-[0.18em] text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
          autoFocus
        />
        {errorMessage ? (
          <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14]">
            {errorMessage}
          </p>
        ) : null}
        <button
          type="submit"
          className="mt-3 w-full border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          enter
        </button>
      </form>
    </>
  );
}
