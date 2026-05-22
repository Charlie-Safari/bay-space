export type CryptiVoteValue = -2 | -1 | 1 | 2;

export type CryptiVoteCounts = {
  downBad: number;
  downTerrible: number;
  score: number;
  total: number;
  upExcellent: number;
  upGood: number;
};

export type CryptiTicker = {
  allTime: CryptiVoteCounts;
  assetType: string;
  category: string;
  chainMarket: string;
  company: string;
  createdAt: string;
  id: string;
  note: string;
  symbol: string;
  today: CryptiVoteCounts;
  userVote?: CryptiVoteValue;
};

export function normalizeCryptiSymbol(symbol: string) {
  return symbol
    .trim()
    .replace(/^\$/, "")
    .replace(/\s+/g, "")
    .toUpperCase()
    .slice(0, 12);
}

export function isCryptiVoteValue(value: unknown): value is CryptiVoteValue {
  return value === -2 || value === -1 || value === 1 || value === 2;
}
