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

export type BayMember = {
  member: string;
  name: string;
  refName: string;
  roles: string;
  title: string;
  createdAt: string;
};

export type BayMemberRecord = BayMember & {
  pinHash: string;
  pinSalt: string;
};
