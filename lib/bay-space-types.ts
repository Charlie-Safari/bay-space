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
