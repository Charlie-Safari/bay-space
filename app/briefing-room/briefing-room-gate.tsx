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
  countFavoritePosts,
  favoriteStoreEvent,
  getFavoritePostIds,
} from "../components/favorite-store";
import {
  getAllowedPostCategories,
  getRoleAcronym,
} from "../../lib/bay-space-roles";

type BriefingRoomGateProps = {
  member: string;
};

type SavedMember = {
  member: string;
  name: string;
  refName: string;
  roles: string;
  title: string;
  email?: string;
  birthdayMonth?: string;
  birthdayYear?: string;
  links?: SettingsLinks;
};

type SettingsLinks = {
  x?: PublicProfileLink;
  linkedin?: PublicProfileLink;
  github?: PublicProfileLink;
  youtube?: PublicProfileLink;
};

type PublicProfileLink = {
  url: string;
  display: boolean;
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

type PostDraft = {
  id: number;
  postCategory: PostCategory;
  topStoryStep: number;
  ticker: string;
  report: string;
  sources: string;
  sourceDrafts: SourceDraft[];
  dailyFoodHeadline: string;
  dailyFoodTag1: string;
  dailyFoodSource1: string;
  dailyFoodSourceOpen1: boolean;
  dailyFoodTag2: string;
  dailyFoodSource2: string;
  dailyFoodSourceOpen2: boolean;
  dailyFoodTag3: string;
  dailyFoodSource3: string;
  dailyFoodSourceOpen3: boolean;
  theoryHeadline: string;
  theoryPost: string;
  theorySources: string[];
  libraryTitle: string;
  librarySubmission: string;
  librarySources: string[];
  postAnonymously: boolean;
  postIncognito: boolean;
  incognitoShelfLabel: string;
  isIncognitoShelfSet: boolean;
};

const postCategories: { id: PostCategory; label: string }[] = [
  { id: "top-story", label: "Top Story" },
  { id: "daily-food", label: "Daily food" },
  { id: "theory", label: "Theory" },
  { id: "library-submission", label: "Library submission" },
];

const activeMemberStorageKey = "bay-space-active-member";
const openPostDraftsStorageKey = "bay-space-open-post-drafts";

function getSettingsLinks(member: SavedMember | null): Required<SettingsLinks> {
  return {
    x: member?.links?.x ?? { url: "", display: false },
    linkedin: member?.links?.linkedin ?? { url: "", display: false },
    github: member?.links?.github ?? { url: "", display: false },
    youtube: member?.links?.youtube ?? { url: "", display: false },
  };
}

async function fetchSavedMember(memberId: string): Promise<SavedMember | null> {
  const response = await fetch(`/api/members/${memberId}`, { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { member?: SavedMember };

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

function limitWords(value: string, limit: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length <= limit) {
    return value;
  }

  return words.slice(0, limit).join(" ");
}

export default function BriefingRoomGate({ member }: BriefingRoomGateProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [resolvedMember, setResolvedMember] = useState(member);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [activePanel, setActivePanel] = useState("id-card");
  const [savedMember, setSavedMember] = useState<SavedMember | null>(null);
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<number | null>(null);
  const [minimizedDrafts, setMinimizedDrafts] = useState<PostDraft[]>([]);
  const [allPosts, setAllPosts] = useState<BayPost[]>([]);
  const [myPosts, setMyPosts] = useState<BayPost[]>([]);
  const [favoritePostIds, setFavoritePostIds] = useState<string[]>([]);
  const [favoritePostCounts, setFavoritePostCounts] = useState<
    Record<string, number>
  >({});
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
  const [settingsMessage, setSettingsMessage] = useState("");
  const [email, setEmail] = useState("");
  const [birthdayMonth, setBirthdayMonth] = useState("");
  const [birthdayYear, setBirthdayYear] = useState("");
  const [settingsLinks, setSettingsLinks] = useState<Required<SettingsLinks>>({
    x: { url: "", display: false },
    linkedin: { url: "", display: false },
    github: { url: "", display: false },
    youtube: { url: "", display: false },
  });
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false);
  const [wipeAccountConfirm, setWipeAccountConfirm] = useState(false);
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
  const [theoryHeadline, setTheoryHeadline] = useState("");
  const [theoryPost, setTheoryPost] = useState("");
  const [theorySources, setTheorySources] = useState(["", ""]);
  const [libraryTitle, setLibraryTitle] = useState("");
  const [librarySubmission, setLibrarySubmission] = useState("");
  const [librarySources, setLibrarySources] = useState(["", ""]);
  const [postAnonymously, setPostAnonymously] = useState(false);
  const [postIncognito, setPostIncognito] = useState(false);
  const [incognitoShelfLabel, setIncognitoShelfLabel] = useState("");
  const [isIncognitoShelfSet, setIsIncognitoShelfSet] = useState(false);
  const allowedPostCategories = getAllowedPostCategories(savedMember?.roles ?? "");
  const canCreatePosts = allowedPostCategories.length > 0;
  const availablePostCategories = postCategories.filter((category) =>
    allowedPostCategories.includes(category.id),
  );
  const activePostCategory = allowedPostCategories.includes(postCategory)
    ? postCategory
    : availablePostCategories[0]?.id ?? "library-submission";
  const accountMarker = getRoleAcronym(savedMember?.roles ?? "");
  const openDrafts = [
    ...minimizedDrafts,
    ...(isPostOpen && activeDraftId
      ? [
          {
            id: activeDraftId,
            postCategory,
            topStoryStep,
            ticker,
            report,
            sources,
            sourceDrafts,
            dailyFoodHeadline,
            dailyFoodTag1,
            dailyFoodSource1,
            dailyFoodSourceOpen1,
            dailyFoodTag2,
            dailyFoodSource2,
            dailyFoodSourceOpen2,
            dailyFoodTag3,
            dailyFoodSource3,
            dailyFoodSourceOpen3,
            theoryHeadline,
            theoryPost,
            theorySources,
            libraryTitle,
            librarySubmission,
            librarySources,
            postAnonymously,
            postIncognito,
            incognitoShelfLabel,
            isIncognitoShelfSet,
          },
        ]
      : []),
  ].sort((leftDraft, rightDraft) => leftDraft.id - rightDraft.id);
  const nextDraftId =
    openDrafts.reduce(
      (highestId, draft) => Math.max(highestId, draft.id),
      0,
    ) + 1;

  function createBlankDraft(id: number): PostDraft {
    return {
      id,
      postCategory: availablePostCategories[0]?.id ?? "library-submission",
      topStoryStep: 1,
      ticker: "",
      report: "",
      sources: "",
      sourceDrafts: [],
      dailyFoodHeadline: "",
      dailyFoodTag1: "",
      dailyFoodSource1: "",
      dailyFoodSourceOpen1: false,
      dailyFoodTag2: "",
      dailyFoodSource2: "",
      dailyFoodSourceOpen2: false,
      dailyFoodTag3: "",
      dailyFoodSource3: "",
      dailyFoodSourceOpen3: false,
      theoryHeadline: "",
      theoryPost: "",
      theorySources: ["", ""],
      libraryTitle: "",
      librarySubmission: "",
      librarySources: ["", ""],
      postAnonymously: false,
      postIncognito: false,
      incognitoShelfLabel: "",
      isIncognitoShelfSet: false,
    };
  }

  function getCurrentDraft(): PostDraft | null {
    if (!activeDraftId) {
      return null;
    }

    return {
      id: activeDraftId,
      postCategory,
      topStoryStep,
      ticker,
      report,
      sources,
      sourceDrafts,
      dailyFoodHeadline,
      dailyFoodTag1,
      dailyFoodSource1,
      dailyFoodSourceOpen1,
      dailyFoodTag2,
      dailyFoodSource2,
      dailyFoodSourceOpen2,
      dailyFoodTag3,
      dailyFoodSource3,
      dailyFoodSourceOpen3,
      theoryHeadline,
      theoryPost,
      theorySources,
      libraryTitle,
      librarySubmission,
      librarySources,
      postAnonymously,
      postIncognito,
      incognitoShelfLabel,
      isIncognitoShelfSet,
    };
  }

  function applyPostDraft(draft: PostDraft) {
    setActiveDraftId(draft.id);
    setPostCategory(draft.postCategory);
    setTopStoryStep(draft.topStoryStep);
    setTicker(draft.ticker);
    setReport(draft.report);
    setSources(draft.sources);
    setSourceDrafts(draft.sourceDrafts);
    setDailyFoodHeadline(draft.dailyFoodHeadline);
    setDailyFoodTag1(draft.dailyFoodTag1);
    setDailyFoodSource1(draft.dailyFoodSource1);
    setDailyFoodSourceOpen1(draft.dailyFoodSourceOpen1);
    setDailyFoodTag2(draft.dailyFoodTag2);
    setDailyFoodSource2(draft.dailyFoodSource2);
    setDailyFoodSourceOpen2(draft.dailyFoodSourceOpen2);
    setDailyFoodTag3(draft.dailyFoodTag3);
    setDailyFoodSource3(draft.dailyFoodSource3);
    setDailyFoodSourceOpen3(draft.dailyFoodSourceOpen3);
    setTheoryHeadline(draft.theoryHeadline);
    setTheoryPost(draft.theoryPost);
    setTheorySources(
      Array.isArray(draft.theorySources) && draft.theorySources.length
        ? draft.theorySources
        : ["", ""],
    );
    setLibraryTitle(draft.libraryTitle);
    setLibrarySubmission(draft.librarySubmission);
    setLibrarySources(
      Array.isArray(draft.librarySources) && draft.librarySources.length
        ? draft.librarySources
        : ["", ""],
    );
    setPostAnonymously(draft.postAnonymously);
    setPostIncognito(draft.postIncognito);
    setIncognitoShelfLabel(draft.incognitoShelfLabel);
    setIsIncognitoShelfSet(draft.isIncognitoShelfSet);
    setPostPreview(null);
    setPreviewWarning(false);
    setDeletePostId("");
  }

  function applySettingsFields(memberRecord: SavedMember | null) {
    setEmail(memberRecord?.email ?? "");
    setBirthdayMonth(memberRecord?.birthdayMonth ?? "");
    setBirthdayYear(memberRecord?.birthdayYear ?? "");
    setSettingsLinks(getSettingsLinks(memberRecord));
  }

  function saveOpenPostDrafts(drafts = openDrafts) {
    if (!resolvedMember) {
      return;
    }

    window.localStorage.setItem(
      `${openPostDraftsStorageKey}:${resolvedMember}`,
      JSON.stringify(drafts),
    );
  }

  function clearOpenPostDrafts() {
    if (resolvedMember) {
      window.localStorage.removeItem(
        `${openPostDraftsStorageKey}:${resolvedMember}`,
      );
    }

    setMinimizedDrafts([]);
    setActiveDraftId(null);
    setIsPostOpen(false);
  }

  useEffect(() => {
    async function syncActiveMember() {
      setIsCheckingSession(true);

      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const data = response.ok
          ? ((await response.json()) as { member?: SavedMember | null })
          : { member: null };
        const activeSavedMember = data.member ?? null;
        const activeMember = activeSavedMember?.member ?? "";

        if (activeMember && activeSavedMember) {
          window.localStorage.setItem(activeMemberStorageKey, activeMember);
          setResolvedMember(activeMember);
          setSavedMember(activeSavedMember);
          applySettingsFields(activeSavedMember);
          setIsUnlocked(true);
          return;
        }

        if (response.status !== 401) {
          return;
        }

        clearOpenPostDrafts();
        window.localStorage.removeItem(activeMemberStorageKey);
        setResolvedMember(member);
        const fallbackMember = await fetchSavedMember(member);
        setSavedMember(fallbackMember);
        applySettingsFields(fallbackMember);
        setIsUnlocked(false);
      } finally {
        setIsCheckingSession(false);
      }
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
    if (!resolvedMember || !isUnlocked) {
      return;
    }

    const savedDrafts = window.localStorage.getItem(
      `${openPostDraftsStorageKey}:${resolvedMember}`,
    );

    if (!savedDrafts) {
      return;
    }

    try {
      const drafts = JSON.parse(savedDrafts) as PostDraft[];

      if (Array.isArray(drafts)) {
        setMinimizedDrafts(drafts);
      }
    } catch {
      window.localStorage.removeItem(
        `${openPostDraftsStorageKey}:${resolvedMember}`,
      );
    }
  }, [isUnlocked, resolvedMember]);

  useEffect(() => {
    if (!resolvedMember || !isUnlocked) {
      return;
    }

    saveOpenPostDrafts(openDrafts);
  }, [isUnlocked, resolvedMember, JSON.stringify(openDrafts)]);

  useEffect(() => {
    function minimizeBeforeNavigation() {
      minimizePostWindow();
    }

    window.addEventListener("bay-space-minimize-posts", minimizeBeforeNavigation);
    window.addEventListener("pagehide", minimizeBeforeNavigation);

    return () => {
      window.removeEventListener(
        "bay-space-minimize-posts",
        minimizeBeforeNavigation,
      );
      window.removeEventListener("pagehide", minimizeBeforeNavigation);
    };
  });

  useEffect(() => {
    function syncMyPosts() {
      getBayPosts().then((savedPosts) => {
        setAllPosts(savedPosts);
        setMyPosts(
          savedPosts.filter((post) => post.author === resolvedMember),
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
    async function syncFavorites() {
      const postIds = myPosts.map((post) => post.id);
      setFavoritePostIds(await getFavoritePostIds());
      setFavoritePostCounts(await countFavoritePosts(postIds));
    }

    syncFavorites();
    window.addEventListener("storage", syncFavorites);
    window.addEventListener(favoriteStoreEvent, syncFavorites);

    return () => {
      window.removeEventListener("storage", syncFavorites);
      window.removeEventListener(favoriteStoreEvent, syncFavorites);
    };
  }, [myPosts]);

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

  async function signOut() {
    await fetch("/api/logout", { method: "POST" });
    clearOpenPostDrafts();
    window.localStorage.removeItem(activeMemberStorageKey);
    window.dispatchEvent(new Event("bay-space-auth"));
    setIsUnlocked(false);
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

    const currentDraft = getCurrentDraft();
    const newDraft = createBlankDraft(nextDraftId);
    setMinimizedDrafts((drafts) =>
      currentDraft ? [...drafts, currentDraft] : drafts,
    );
    applyPostDraft(newDraft);
    setIsPostOpen(true);
    setActivePanel("post");
  }

  function minimizePostWindow() {
    const currentDraft = getCurrentDraft();

    if (!currentDraft) {
      return;
    }

    const nextDrafts = [
      ...minimizedDrafts.filter((draft) => draft.id !== currentDraft.id),
      currentDraft,
    ];
    saveOpenPostDrafts(nextDrafts);
    setMinimizedDrafts((drafts) => [
      ...drafts.filter((draft) => draft.id !== currentDraft.id),
      currentDraft,
    ]);
    setActiveDraftId(null);
    setIsPostOpen(false);
    setActivePanel((panel) => (panel === "post" ? "id-card" : panel));
    setPostPreview(null);
    setPreviewWarning(false);
  }

  function restorePostDraft(draftId: number) {
    const draft = minimizedDrafts.find((postDraft) => postDraft.id === draftId);
    const currentDraft = getCurrentDraft();

    if (!draft) {
      if (activeDraftId === draftId) {
        setActivePanel("post");
      }

      return;
    }

    setMinimizedDrafts((drafts) => [
      ...drafts.filter((postDraft) => postDraft.id !== draftId),
      ...(currentDraft ? [currentDraft] : []),
    ]);
    applyPostDraft(draft);
    setIsPostOpen(true);
    setActivePanel("post");
  }

  function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreatePosts || !allowedPostCategories.includes(activePostCategory)) {
      return;
    }

    setPostPreview(buildCurrentPost());
  }

  function buildCurrentPost(): Omit<BayPost, "id" | "createdAt" | "dateKey"> {
    const author = resolvedMember || "unknown";

    if (activePostCategory === "top-story") {
      return {
        category: activePostCategory,
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

    if (activePostCategory === "daily-food") {
      const dateKey = getDateKey();
      const dailyFoodOrder =
        allPosts.filter(
          (post) => post.category === "daily-food" && post.dateKey === dateKey,
        ).length + 1;

      return {
        category: activePostCategory,
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

    if (activePostCategory === "theory") {
      return {
        category: activePostCategory,
        title: theoryHeadline || "untitled theory",
        body: theoryPost,
        anonymous: postAnonymously,
        incognito: postIncognito,
        author,
        shelfLabel: postIncognito ? incognitoShelfLabel : undefined,
        shelfCode: postIncognito
          ? normalizeShelfLabel(incognitoShelfLabel)
          : undefined,
        meta: {
          sources: theorySources.map((source) => source.trim()).filter(Boolean),
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
        sources: librarySources.map((source) => source.trim()).filter(Boolean),
      },
    };
  }

  async function confirmPost() {
    if (
      postPreview &&
      canCreatePosts &&
      allowedPostCategories.includes(postPreview.category)
    ) {
      await saveBayPost(postPreview);
    }

    resetPostDraft();
  }

  async function wipeAllPosts() {
    await Promise.all(
      myPosts.map((post) => deleteBayPost(post.id)),
    );
    setDeletePostId("");
    setIsWipeAllOpen(false);
  }

  function editPost() {
    setPostPreview(null);
    setPreviewWarning(false);
  }

  function resetPostDraft() {
    const closingDraftId = activeDraftId;
    const nextDrafts = closingDraftId
      ? minimizedDrafts.filter((draft) => draft.id !== closingDraftId)
      : minimizedDrafts;

    setIsPostOpen(false);
    setActiveDraftId(null);
    setMinimizedDrafts(nextDrafts);
    saveOpenPostDrafts(nextDrafts);
    setActivePanel("id-card");
    setPostCategory(availablePostCategories[0]?.id ?? "library-submission");
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
    setTheoryHeadline("");
    setTheoryPost("");
    setTheorySources(["", ""]);
    setLibraryTitle("");
    setLibrarySubmission("");
    setLibrarySources(["", ""]);
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

  function focusTheorySource(index: number) {
    if (index === theorySources.length - 1 && index >= 1) {
      setTheorySources((drafts) => [...drafts, ""]);
    }
  }

  function updateTheorySource(index: number, value: string) {
    setTheorySources((drafts) =>
      drafts.map((source, sourceIndex) =>
        sourceIndex === index ? value : source,
      ),
    );
  }

  function focusLibrarySource(index: number) {
    if (index === librarySources.length - 1 && index >= 1) {
      setLibrarySources((drafts) => [...drafts, ""]);
    }
  }

  function updateLibrarySource(index: number, value: string) {
    setLibrarySources((drafts) =>
      drafts.map((source, sourceIndex) =>
        sourceIndex === index ? value : source,
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

    setSavedMember(data.member);
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

  function updateSettingsLink(
    key: keyof Required<SettingsLinks>,
    field: keyof PublicProfileLink,
    value: string | boolean,
  ) {
    setSettingsLinks((currentLinks) => ({
      ...currentLinks,
      [key]: {
        ...currentLinks[key],
        [field]: value,
      },
    }));
    setSettingsMessage("");
  }

  async function saveSettings() {
    const response = await fetch(`/api/members/${resolvedMember}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "settings",
        settings: {
          email,
          birthdayMonth,
          birthdayYear,
          links: settingsLinks,
        },
      }),
    });
    const data = (await response.json()) as { member?: SavedMember };

    if (!response.ok || !data.member) {
      setSettingsMessage("settings not saved");
      return;
    }

    setSavedMember(data.member);
    setSettingsMessage("settings saved");
  }

  async function wipeAccount() {
    const response = await fetch(`/api/members/${resolvedMember}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "wipe-account" }),
    });

    if (!response.ok) {
      setSettingsMessage("wipe failed");
      return;
    }

    window.dispatchEvent(new Event(postStoreEvent));
    setMyPosts([]);
    setAllPosts((posts) =>
      posts.filter((post) => post.author !== resolvedMember),
    );
    setWipeAccountConfirm(false);
    setDeleteAccountConfirm(false);
    setSettingsMessage("account wiped");
  }

  async function deleteAccount() {
    const response = await fetch(`/api/members/${resolvedMember}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setSettingsMessage("delete failed");
      return;
    }

    await fetch("/api/logout", { method: "POST" });
    window.localStorage.removeItem(activeMemberStorageKey);
    window.dispatchEvent(new Event("bay-space-auth"));
    window.dispatchEvent(new Event(postStoreEvent));
    window.location.href = "/";
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
          {openDrafts.map((draft) => (
            <button
              key={draft.id}
              type="button"
              onClick={() => restorePostDraft(draft.id)}
              className={`border-2 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] ${
                activePanel === "post" && activeDraftId === draft.id
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              post {draft.id} - [open]
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  if (isUnlocked) {
    return (
      <>
        {header}
        <div
          className={`mt-10 grid w-full max-w-4xl gap-6 ${
            isPostOpen && activePanel === "post"
              ? ""
              : "md:grid-cols-[220px_1fr]"
          }`}
        >
        {isPostOpen && activePanel === "post" ? null : (
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
              onClick={() => {
                setActivePanel("settings");
                setSettingsMessage("");
                setDeleteAccountConfirm(false);
                setWipeAccountConfirm(false);
              }}
              className={`border px-3 py-2 text-left transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_12px_rgba(57,255,20,0.35)] ${
                activePanel === "settings"
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#1d7f12] text-[#39ff14]"
              }`}
            >
              settings
            </button>
            <button
              onClick={signOut}
              className="border border-[#ff3b3b] px-3 py-2 text-left text-[#ff6b6b]"
            >
              sign out
            </button>
          </div>
        </aside>
        )}
        <section
          className={`border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)] ${
            isPostOpen && activePanel === "post" ? "order-1" : ""
          }`}
        >
          {activePanel === "post" && isPostOpen ? (
            postPreview ? (
              <div
                ref={previewRef}
                onAnimationEnd={() => setPreviewWarning(false)}
                className={
                  previewWarning ? "animate-[option-shake_180ms_linear]" : ""
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                    preview
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={minimizePostWindow}
                      className="grid h-7 w-7 place-items-center border border-[#1d7f12] text-sm font-black text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                      aria-label="Minimize post window"
                      title="Minimize"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={resetPostDraft}
                      className="grid h-7 w-7 place-items-center border border-[#ff3b3b] text-sm font-black text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
                      aria-label="Wipe post window"
                      title="Wipe"
                    >
                      x
                    </button>
                  </div>
                </div>
                <article className="mt-5 border-2 border-[#1d7f12] px-4 py-4">
                  {postPreview.category === "daily-food" &&
                  typeof postPreview.meta?.dailyFoodOrder === "string" ? (
                    <p className="float-right text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
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
                    className={`border-2 border-[#39ff14] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#39ff14] shadow-[0_0_12px_rgba(57,255,20,0.55)] transition hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_18px_rgba(57,255,20,0.72)] focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
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
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                  post window
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={minimizePostWindow}
                    className="grid h-7 w-7 place-items-center border border-[#1d7f12] text-sm font-black text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                    aria-label="Minimize post window"
                    title="Minimize"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={resetPostDraft}
                    className="grid h-7 w-7 place-items-center border border-[#ff3b3b] text-sm font-black text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
                    aria-label="Wipe post window"
                    title="Wipe"
                  >
                    x
                  </button>
                </div>
              </div>
              <fieldset className="mt-5 grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Choose post type</legend>
                {availablePostCategories.map((category) => (
                  <label
                    key={category.id}
                    className={`relative flex items-center gap-5 overflow-visible border bg-black px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0] transition ${
                      activePostCategory === category.id
                        ? "border-[#39ff14] shadow-[0_0_18px_rgba(57,255,20,0.42)]"
                        : "border-[#1d7f12]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="post-category"
                      checked={activePostCategory === category.id}
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

              {activePostCategory === "top-story" ? (
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

              {activePostCategory === "daily-food" ? (
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

              {activePostCategory === "theory" ? (
                <div className="mt-6 grid gap-5">
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      headline{" "}
                      <span className="text-xs text-[#7f9f78]">
                        ({75 - theoryHeadline.length})
                      </span>
                    </span>
                    <input
                      value={theoryHeadline}
                      onChange={(event) =>
                        setTheoryHeadline(event.target.value.slice(0, 75))
                      }
                      className="min-h-[3rem] w-full border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      theory{" "}
                      <span className="text-xs text-[#7f9f78]">
                        ({50000 - theoryPost.length})
                      </span>
                    </span>
                    <textarea
                      value={theoryPost}
                      onChange={(event) =>
                        setTheoryPost(event.target.value.slice(0, 50000))
                      }
                      onInput={(event) => expandTextarea(event.currentTarget)}
                      rows={1}
                      className="min-h-[3rem] w-full resize-none overflow-hidden border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                  <div className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      sources
                    </span>
                    <div className="grid gap-2">
                      {theorySources.map((source, index) => (
                        <label
                          key={index}
                          className="grid grid-cols-[1.5rem_1fr] items-center gap-2"
                        >
                          <span className="text-lg font-black text-[#7f9f78]">
                            +
                          </span>
                          <input
                            value={source}
                            onFocus={() => focusTheorySource(index)}
                            onChange={(event) =>
                              updateTheorySource(index, event.target.value)
                            }
                            placeholder="[source]"
                            className="h-11 border border-transparent bg-black px-0 py-2 text-sm font-black text-[#39ff14] caret-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:border-[#39ff14] focus:bg-[#001100] focus:px-3 focus:shadow-[inset_0_-0.55rem_0_rgba(57,255,20,0.28)]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {activePostCategory === "library-submission" ? (
                <div className="mt-6 grid gap-5">
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      shelf label{" "}
                      <span className="text-xs text-[#7f9f78]">
                        ({75 - libraryTitle.trim().split(/\s+/).filter(Boolean).length})
                      </span>
                    </span>
                    <input
                      value={libraryTitle}
                      onChange={(event) =>
                        setLibraryTitle(limitWords(event.target.value, 75))
                      }
                      className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      library submission{" "}
                      <span className="text-xs text-[#7f9f78]">
                        ({50000 - librarySubmission.length})
                      </span>
                    </span>
                    <textarea
                      value={librarySubmission}
                      onChange={(event) =>
                        setLibrarySubmission(event.target.value.slice(0, 50000))
                      }
                      onInput={(event) => expandTextarea(event.currentTarget)}
                      rows={7}
                      className="min-h-[11rem] w-full resize-none overflow-hidden border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </label>
                  <div className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                      sources
                    </span>
                    <div className="grid gap-2">
                      {librarySources.map((source, index) => (
                        <label
                          key={index}
                          className="grid grid-cols-[1.5rem_1fr] items-center gap-2"
                        >
                          <span className="text-lg font-black text-[#7f9f78]">
                            +
                          </span>
                          <input
                            value={source}
                            onFocus={() => focusLibrarySource(index)}
                            onChange={(event) =>
                              updateLibrarySource(index, event.target.value)
                            }
                            placeholder="[source]"
                            className="h-11 border border-transparent bg-black px-0 py-2 text-sm font-black text-[#39ff14] caret-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:border-[#39ff14] focus:bg-[#001100] focus:px-3 focus:shadow-[inset_0_-0.55rem_0_rgba(57,255,20,0.28)]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 grid gap-2">
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
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="submit"
                  className="min-w-0 border-2 border-[#39ff14] px-3 py-3 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] sm:px-5 sm:text-sm sm:tracking-[0.18em]"
                >
                  Submit to the ether
                </button>
                <button
                  type="button"
                  onClick={resetPostDraft}
                  className="shrink-0 border border-[#ff3b3b] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
                >
                  wipe
                </button>
              </div>
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
                    Confirm command?
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
                        {favoritePostCounts[post.id] ?? 0}
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
                                await deleteBayPost(post.id);
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
          ) : activePanel === "settings" ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
                settings
              </p>
              <div className="mt-5 grid gap-5">
                <button
                  type="button"
                  className="w-fit border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]"
                >
                  Privacy options button (coming soon)
                </button>

                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                    Email (optional)
                  </span>
                  <input
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value.slice(0, 120));
                      setSettingsMessage("");
                    }}
                    className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                  />
                </label>

                <div className="grid gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                    Birthday
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <input
                      inputMode="numeric"
                      placeholder="month"
                      value={birthdayMonth}
                      onChange={(event) => {
                        setBirthdayMonth(
                          event.target.value.replace(/\D/g, "").slice(0, 2),
                        );
                        setSettingsMessage("");
                      }}
                      className="w-28 border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                    />
                    <input
                      inputMode="numeric"
                      placeholder="year"
                      value={birthdayYear}
                      onChange={(event) => {
                        setBirthdayYear(
                          event.target.value.replace(/\D/g, "").slice(0, 4),
                        );
                        setSettingsMessage("");
                      }}
                      className="w-28 border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
                    />
                  </div>
                </div>

                <div className="grid gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                    Personal Links
                  </p>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#7f9f78]">
                    option to display on public profile page
                  </p>
                  {[
                    { id: "x", label: "X" },
                    { id: "linkedin", label: "linkd in" },
                    { id: "github", label: "github" },
                    { id: "youtube", label: "youtube" },
                  ].map((link) => {
                    const linkId = link.id as keyof Required<SettingsLinks>;

                    return (
                      <div
                        key={link.id}
                        className="grid gap-2 border border-[#1d7f12] px-3 py-3 sm:grid-cols-[120px_1fr]"
                      >
                        <label className="grid gap-2">
                          <span className="text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                            {link.label}
                          </span>
                          <input
                            value={settingsLinks[linkId].url}
                            onChange={(event) =>
                              updateSettingsLink(
                                linkId,
                                "url",
                                event.target.value,
                              )
                            }
                            className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-bold text-[#39ff14] outline-none focus:ring-2 focus:ring-[#39ff14]"
                          />
                        </label>
                        <label className="flex items-end gap-3 text-xs font-black uppercase tracking-[0.14em] text-[#d7ffd0]">
                          <input
                            type="checkbox"
                            checked={settingsLinks[linkId].display}
                            onChange={(event) =>
                              updateSettingsLink(
                                linkId,
                                "display",
                                event.target.checked,
                              )
                            }
                            className="h-4 w-4 accent-[#39ff14]"
                          />
                          display on public profile
                        </label>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={saveSettings}
                  className="w-fit border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                >
                  save settings
                </button>

                <div className="border-t border-[#1d7f12] pt-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                    Delete Account buttons
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteAccountConfirm(true);
                        setWipeAccountConfirm(false);
                        setSettingsMessage("");
                      }}
                      className="border border-[#ff3b3b] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black"
                    >
                      delete account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWipeAccountConfirm(true);
                        setDeleteAccountConfirm(false);
                        setSettingsMessage("");
                      }}
                      className="border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black"
                    >
                      wipe account
                    </button>
                  </div>

                  {deleteAccountConfirm ? (
                    <div className="mt-4 border border-[#ff3b3b] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                        you wont be able ot undo this, your account number will
                        be retired. Continue?
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={deleteAccount}
                          className="border border-[#ff3b3b] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black"
                        >
                          Full Erase
                        </button>
                        <button
                          type="button"
                          onClick={wipeAccount}
                          className="border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black"
                        >
                          Wipe instead
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {wipeAccountConfirm ? (
                    <div className="mt-4 border border-[#1d7f12] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
                        all post across all categorys will be erased. Continue?
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={wipeAccount}
                          className="border border-[#ff3b3b] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black"
                        >
                          Wipe
                        </button>
                        <button
                          type="button"
                          onClick={() => setWipeAccountConfirm(false)}
                          className="border border-[#39ff14] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 border border-[#1d7f12] bg-[#001100] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
                      Privacy + agreement
                    </p>
                    <p className="mt-3 text-xs font-bold uppercase leading-5 tracking-[0.14em] text-[#d7ffd0]">
                      BaySpace stores account, session, post, saved-post,
                      profile, and moderation data needed to run the room.
                      Public posts can be seen publicly. Anonymous and
                      incognito settings change public display only; they do
                      not hide records from BaySpace systems.
                    </p>
                    <Link
                      href="/BaySpace-Privacy-Notice-and-user-agreement.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                    >
                      privacy + user agreement
                    </Link>
                    <label className="mt-4 flex items-center gap-3 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14]">
                      <input
                        type="checkbox"
                        checked
                        readOnly
                        className="h-4 w-4 accent-[#39ff14]"
                      />
                      user agreement completed at sign up
                    </label>
                  </div>
                </div>

                {settingsMessage ? (
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#39ff14]">
                    {settingsMessage}
                  </p>
                ) : null}
              </div>
            </div>
          ) : activePanel === "id-card" && savedMember ? (
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                EXPLORER NUMBER - #{savedMember.member}
              </p>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                TITLE: {savedMember.title}
              </p>
              {accountMarker ? (
                <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#d7ffd0]">
                  ID CARD: ({accountMarker})
                </p>
              ) : null}
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

  if (isCheckingSession) {
    return (
      <div className="w-full max-w-md border-l-2 border-[#39ff14] pl-4 text-sm font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
        syncing access
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl border-2 border-[#1d7f12] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
        briefing room requires an active member session
      </p>
      <p className="mt-4 text-sm font-bold uppercase leading-6 tracking-[0.14em] text-[#7f9f78]">
        enter your member number in the top bar or join the circle to create an
        account.
      </p>
      <Link
        href="/join-the-circle"
        className="mt-5 inline-flex border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        join the circle
      </Link>
    </div>
  );
}
