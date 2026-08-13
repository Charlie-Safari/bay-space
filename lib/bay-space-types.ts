import type {
  BayRank,
  BayoCardId,
  BayoStampId,
  BayoTitleId,
  CryptiRank,
  GateKey,
} from "./bay-space-ranks";

export type BayPostCategory =
  | "top-story"
  | "daily-food"
  | "theory"
  | "library-submission";

export type BayPost = {
  id: string;
  category: BayPostCategory;
  title: string;
  body: string;
  createdAt: string;
  dateKey: string;
  anonymous: boolean;
  incognito?: boolean;
  author: string;
  shelfLabel?: string;
  shelfCode?: string;
  meta?: Record<string, string | string[]>;
};

export type BayPostComment = {
  authorActiveCards?: BayoCardId[];
  id: string;
  author: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type BayPostTruthVoteSummary = {
  averageScore: number;
  pointValue: number;
  scoreTotal: number;
  userScore: number | null;
  voteCount: number;
};

export type BayDirectMessageMember = {
  member: string;
  name: string;
  refName: string;
  title: string;
};

export type BayDirectMessage = {
  body: string;
  createdAt: string;
  expiresAt: string;
  id: string;
  isMine: boolean;
  readAt?: string;
  recipientMember: string;
  senderMember: string;
};

export type BayDirectConversation = {
  hasBlockedMe: boolean;
  isBlockedByMe: boolean;
  latestMessage: BayDirectMessage;
  member: BayDirectMessageMember;
  unreadCount: number;
};

export type BayStatsPostRow = {
  diamonds: number;
  headline: string;
  id: string;
  points: string;
  shares: number;
  tickets: number;
  views: number;
};

export type BayStatsParticipationRow = {
  diamond: boolean;
  headline: string;
  id: string;
  points: string;
  shares: number;
  ticket: boolean;
  views: number;
};

export type BayStatsMiscRow = {
  label: string;
  points: string;
  value: string;
};

export type BayMemberStats = {
  baySpaceParticipation: BayStatsParticipationRow[];
  conspiracyPosts: BayStatsPostRow[];
  cryptiBuzzPosts: BayStatsPostRow[];
  cryptiDegenPosts: BayStatsPostRow[];
  cryptiNewsPosts: BayStatsPostRow[];
  cryptiParticipation: BayStatsParticipationRow[];
  factsPosts: BayStatsPostRow[];
  miscPoints: BayStatsMiscRow[];
};

export type BayMember = {
  activeBayoCards: BayoCardId[];
  availablePoints: number;
  bayoCards: BayoCardId[];
  bayoCoins: number;
  bayoStamps: BayoStampId[];
  bayoTokens: number;
  cryptiAgreementAcceptedAt?: string;
  cryptiAgreementVersion?: string;
  cryptiRank: CryptiRank;
  gateKeys: GateKey[];
  lifetimePoints: number;
  lifetimeTokens: number;
  member: string;
  name: string;
  purchasedTitles: BayoTitleId[];
  rank: BayRank;
  refName: string;
  roles: string;
  title: string;
  createdAt: string;
  email?: string;
  birthdayMonth?: string;
  birthdayYear?: string;
  links?: {
    _cryptiOwnedTickers?: string[];
    x?: PublicLink;
    linkedin?: PublicLink;
    github?: PublicLink;
    youtube?: PublicLink;
  };
};

export type BayMemberRecord = BayMember & {
  pinHash: string;
  pinSalt: string;
};

export type PublicLink = {
  url: string;
  display: boolean;
};
