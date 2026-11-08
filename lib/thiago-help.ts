import {
  bayoCoinExchangeRate,
  bayoTokenExchangeRate,
  graduationMilestonePoints,
  graduationTokenCost,
  posterIICoinBonus,
} from "./bay-space-ranks";
import {
  articleReadPointValue,
  currentEventTruthVotePointValue,
  dailySpinLifetimePointsPerCoin,
  dailySpinMaxCoins,
  participationCommentPointValue,
  participationFavoritePointValue,
  participationSharePointValue,
  participationTicketPointValue,
  participationTruthVotePointValue,
} from "./bay-space-scoring";

export type ThiagoMemberStats = {
  availablePoints?: number;
  lifetimePoints?: number;
  bayoCoins?: number;
  bayoTokens?: number;
  rank: string;
  cryptiRank: string;
  promotion: { label: string; pointsUntil: number } | null;
};

const pointsGuide = "Available points are your spendable balance. Trade them for Bayo Coins in Exchange or use them for Current Events comments. Lifetime points track rank progress and stay with you when you trade available points. Post score tracks how a particular post is doing.";
const exchangeGuide = `Open Briefing Room → Exchange. In Get Coins, trade ${bayoCoinExchangeRate} available points for 1 Bayo Coin. In Get Tokens, trade ${bayoTokenExchangeRate} coins for 1 token. That's ${bayoCoinExchangeRate * bayoTokenExchangeRate} points per token if you start with zero coins. Coins buy cards. Tokens buy unlocks in Badge Quest.`;
const dailySpinGuide = `The Daily Spin in the Briefing Room awards 0–${dailySpinMaxCoins} Bayo Coins and ${dailySpinLifetimePointsPerCoin} lifetime points per coin, once per Pacific day.`;
const earnGuide = `Earn points by opening an eligible article for the first time (+${articleReadPointValue}), sharing a post for the first time (+${participationSharePointValue}), saving a favorite diamond (+${participationFavoritePointValue}), or casting your first truth vote on a post (+${currentEventTruthVotePointValue} in Current Events, +${participationTruthVotePointValue} in Conspiracy). A Conspiracy ticket earns +${participationTicketPointValue} and a first Conspiracy comment earns +${participationCommentPointValue}. Your own posts are excluded from participation rewards. ${dailySpinGuide}`;

const guideTopics = [
  { match: /\b(?:delete|wipe) (?:my |the )?account\b/, answer: "In Briefing Room → Settings, Delete account permanently erases the account. Wipe Account clears posts and keeps your ID card." },
  { match: /\b(?:log[ -]?in|sign[ -]?in|forgot|password|account support)\b/, answer: "Use Log In at the top of Bay Space, enter your username or member number, then enter your password. For account support, email bayoadmin@protonmail.com and include your username or member number." },
  { match: /\b(?:sign[ -]?up|join the circle|create an account)\b/, answer: "Open Join the Circle, choose a name and password, and enter Bay Space as Reader I." },
  { match: /\b(?:rank|ranks|promotion|graduate|graduation|poster i{1,3}|reader ii)\b/, answer: `Bay Space promotions require both lifetime points and participation. Your ID Card shows the points and checklist for your next rank. Poster I unlocks posting in Conspiracy and Library, commenting, poll voting, and the weekly quiz. Reader II unlocks poll wagers. Poster II unlocks anonymous posting and pays a one-time ${posterIICoinBonus}-coin bonus. Poster III doubles point rewards except Daily Spin. Buy Graduation for ${graduationTokenCost} tokens in Exchange to unlock Badge Quest and the +CRYPTI purchase. At ${graduationMilestonePoints.toLocaleString("en-US")} lifetime points you earn ${graduationTokenCost} tokens once.` },
  { match: /\b(?:paste\s*(?:&|and)\s*go|format|black light|thiago)\b/, answer: "Open Black Light from the Briefing Room. Owl answers site help and article questions, Investigate looks through saved articles and their listed sources, Format prepares a draft, and Paste & Go checks it for review." },
  { match: /\b(?:comments?|commenting|truth votes?|relevance votes?|voting)\b/, answer: "Commenting unlocks at Poster I. Current Events comments cost one available point per character. Conspiracy and Library comments are free. Comments are limited to 500 characters. On Current Events, truth and relevance votes are separate." },
  { match: /\b(?:favorites?|diamonds?|bookmark)\b/, answer: "Press the green diamond on a post to save it. Find saved posts by category in Briefing Room → Favorites." },
  { match: /\b(?:make a post|create a post|publish|posting|incog(?:nito)?|anon(?:ymous)?)\b/, answer: "Use Create a post in the Briefing Room. Your rank and roles determine where you can post. Conspiracy is for theories, Current Events is for fact-based news, and Library is for longer reading. Anon hides your displayed name. Incog keeps the post out of public feeds." },
  { match: /\b(?:crypti|safari nation|bayo\+|oracle badge|badge quest|cards?|exchange)\b/, answer: exchangeGuide + " Check Badge Quest for the unlocks available to your rank." },
  { match: /\b(?:navigation|navigate|basecamp|briefing room|where is|where do i find)\b/, answer: "The Bay Space logo opens Basecamp and the Briefing Room. The Briefing Room has your ID card, balances, Exchange and Black Light. Use the main navigation for Conspiracy, Current Events, and Library." },
  { match: /\b(?:how to|help|what is bay ?space)\b/, answer: "Ask me about points, earning rewards, tokens, your stats, rank, posting, votes, favorites, or getting around. The How To Library has the full guide." },
];

function describeStats(stats: ThiagoMemberStats | null) {
  if (!stats) return "Open your signed-in Briefing Room to see your balances and rank.";
  const count = (value?: number) => (value ?? 0).toLocaleString("en-US");

  return [
    `Available points · ${count(stats.availablePoints)} to spend or exchange`,
    `Lifetime points · ${count(stats.lifetimePoints)} toward rank progression`,
    `Bayo Coins · ${count(stats.bayoCoins)} for cards or exchanging for tokens`,
    `Tokens · ${count(stats.bayoTokens)} for Badge Quest unlocks`,
    `Rank · ${stats.rank}${stats.cryptiRank ? ` / +CRYPTI ${stats.cryptiRank}` : ""}`,
    ...(stats.promotion ? [`Next promotion · ${count(stats.promotion.pointsUntil)} lifetime points to ${stats.promotion.label}`] : []),
  ].join("\n");
}

export function answerThiagoHelp(question: string, stats: ThiagoMemberStats | null): string | null {
  const prompt = question.toLowerCase().replace(/’/g, "'");
  if (/\b(?:key|main) points (?:of|in|from)\b/.test(prompt)) return null;
  const economy = /\b(?:points?|coins?|tokens?|exchange|balance)\b/.test(prompt);
  const asksForStats = /\b(?:my stats|current stats|my balances?|my rank|my (?:available |lifetime |bayo )?(?:points|coins|tokens)|how many (?:available |lifetime |bayo )?(?:points|coins|tokens) (?:do i|have i|until)|points until (?:my |the )?next)\b/.test(prompt);
  const asksToEarn = /\b(?:earn|earning|gain|accrue|farm)\b|\bget (?:more )?points\b/.test(prompt);
  const asksToTrade = /\b(?:coins?|tokens?|exchange|trade|convert)\b/.test(prompt);

  if (asksToEarn && (economy || /\bearn more\b/.test(prompt))) {
    return [earnGuide, asksToTrade ? exchangeGuide : null, asksForStats ? describeStats(stats) : null]
      .filter(Boolean).join("\n\n");
  }
  if (asksForStats) return describeStats(stats);
  if (/\b(?:daily spin|slot machine)\b/.test(prompt)) return dailySpinGuide;
  if (asksToTrade && economy) return /\bpoints?\b/.test(prompt) ? `${pointsGuide}\n\n${exchangeGuide}` : exchangeGuide;
  if (/\b(?:points?|post score)\b/.test(prompt)) return pointsGuide;
  return guideTopics.find(({ match }) => match.test(prompt))?.answer ?? null;
}
