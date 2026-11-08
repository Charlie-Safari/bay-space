import { baySpaceAgreementHref } from "../../lib/bay-space-agreement";
import {
  bayRanks,
  bayoCoinExchangeRate,
  bayoTokenExchangeRate,
  defaultStampPointReward,
  graduationTokenCost,
  graduationMilestonePoints,
  getBayRankConfig,
  posterIICoinBonus,
} from "../../lib/bay-space-ranks";
import { getParticipationChecklist } from "../../lib/bay-space-promotion";
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
  profileVisitPointValue,
} from "../../lib/bay-space-scoring";
import { theoryIcebergCategories } from "../../lib/theory-categories";

type GuideTopic = {
  id: string;
  label: string;
  intro: string;
  groups: {
    title: string;
    entries: { label: string; detail: string }[];
  }[];
  links?: { label: string; href: string }[];
};

const count = (value: number) => value.toLocaleString("en-US");
const rankAccess = {
  reader: "Read every Bay Space feed, including Library, and participate as a member.",
  "reader-ii": "Unlock optional wagers on polls.",
  poster: "Post in Conspiracy and Library, leave comments, vote on polls, and take the weekly quiz.",
  "poster-ii": `Earn an author badge and a one-time ${posterIICoinBonus}-coin promotion bonus. Unlock anonymous posting.`,
  "poster-iii": "Upgrade your author badge and display it on comments. Earn double point rewards at this rank. Daily Spin pays its regular rate.",
  graduation: "Unlock Badge Quest, Cards, and the +CRYPTI purchase.",
};

export const howToTopics: GuideTopic[] = [
  {
    id: "start",
    label: "Start here",
    intro: "You can read Bay Space before creating an account. Start on the welcome page and choose where to explore.",
    groups: [
      {
        title: "On the welcome page",
        entries: [
          { label: "Conspiracies", detail: "Browse theories, strange signals, original accounts, and the evidence people share." },
          { label: "Current Events", detail: "Open Current Events for sourced news and Top Story." },
          { label: "Know Something", detail: "While signed out, leave an anonymous note in Level 06 of the Conspiracy iceberg. You can delete your note from the confirmation window for two minutes." },
          { label: "Join the Circle", detail: "Create an account when you’re ready to participate. Choose a name, set and confirm your password, and review the User Agreement during signup. Email is optional." },
        ],
      },
      {
        title: "Sign in",
        entries: [
          { label: "Find your account", detail: "Enter your account name or five-digit Explorer number in the Log In box. Press Log In, the spaceship button on the main navigation, or Enter." },
          { label: "Enter your password", detail: "The next screen asks for your password. Sign in to reach your Briefing Room. Save your Explorer number so you can find your account later." },
        ],
      },
    ],
    links: [{ label: "Bay Space home", href: "/" }, { label: "Join the Circle", href: "/join-the-circle" }, { label: "Log in", href: "/login" }],
  },
  {
    id: "navigation",
    label: "Navigation",
    intro: "The main tabs open the public feeds. The Bay Space logo takes you to Basecamp and opens the Briefing Room when you’re signed in.",
    groups: [
      {
        title: "Find something to read",
        entries: [
          { label: "Conspiracy Theories", detail: "Open Conspiracy from the top navigation or the left half of the split card in the Briefing Room. Browse by category and open a headline to see the account, sources, and discussion." },
          { label: "Current Events", detail: "Open the top tab or the right half of the Briefing Room card. Choose This Week, This Month, or Categories to browse. Use the sort controls inside the feed or open Top Story from its button." },
          { label: "Polls", detail: "Open the top tab to see open polls, polls that are closing, and results." },
        ],
      },
      {
        title: "Find a resource",
        entries: [
          { label: "Library", detail: "Use the book icon in the footer when signed in. Search the Library for submissions and matching post tags, or enter a shelf label to open a shared item you have access to." },
          { label: "How To", detail: "The footer link opens this guide. Owl in Black Light also answers questions about Bay Space." },
        ],
      },
    ],
    links: [{ label: "Conspiracy Theories", href: "/theories" }, { label: "Current Events", href: "/facts-on-news" }, { label: "Polls", href: "/polls" }],
  },
  {
    id: "briefing-room",
    label: "Briefing Room",
    intro: "Your Briefing Room is where you post, check your progress, and open your account tools.",
    groups: [
      {
        title: "Main room",
        entries: [
          { label: "Daily Spin", detail: `Open the slot machine once a day to win 0–${dailySpinMaxCoins} Bayo Coins and ${dailySpinLifetimePointsPerCoin} lifetime points per coin. The spin resets by Pacific date, and its panel closes five seconds after showing the result.` },
          { label: "Create a post and Paste & Go", detail: `Both shortcuts are visible from the start. Reach Poster I by earning ${count(getBayRankConfig("poster").minLifetimePoints)} lifetime points and completing the participation checklist in your ID Card. If a shortcut is locked, it shows the requirement for six seconds and shakes when motion is enabled.` },
          { label: "Circles and article feeds", detail: "Open Circles to view the circles and connections stored in your browser. The split card opens Conspiracy Theories and Current Events." },
          { label: "Black Light and Exchange", detail: "Open Black Light to ask Thiago. Under Exchange you’ll see Lifetime Points, available Points, Coins, and Tokens. The card below shows your rank and progress." },
        ],
      },
      {
        title: "Options",
        entries: [
          { label: "Inbox and Quiz", detail: "Open your conversations in Inbox. Choose Quiz and then Take Quiz for this week’s Current Events questions." },
          { label: "Favorites, Stats, and My Posts", detail: "Find saved posts, check activity, and manage your published work." },
          { label: "ID Card and Profile", detail: "Expand ID Card to see your Explorer number, code name, rank, lifetime points, participation checklist, and vote tickets. Profile opens your public page." },
          { label: "Rank", detail: "Open Rank under Options to compare your activity totals with the targets for your current rank and see what is left for your next promotion." },
          { label: "Settings and Sign Out", detail: "Open Settings for password, profile links, and account controls. Use Back or the Bay Space logo to return to the main Briefing Room." },
        ],
      },
    ],
    links: [{ label: "Open Briefing Room", href: "/briefing-room" }],
  },
  {
    id: "points",
    label: "Ranks & points",
    intro: "Rank promotions require both lifetime points and participation. Available points are your spendable balance. A post’s public score is separate from both.",
    groups: [
      {
        title: "The standard rank path",
        entries: [
          ...bayRanks.map((rank) => {
            const checklist = getParticipationChecklist(rank.id)
              .map(({ label, required }) => `${count(required)} ${label.toLowerCase()}`)
              .join(", ");
            const requirement = rank.id === "reader"
              ? "Starting rank"
              : rank.id === "graduation"
                ? `${graduationTokenCost} tokens at Poster III`
                : `${count(rank.minLifetimePoints)} lifetime points`;
            return {
              label: `${rank.label} · ${requirement}`,
              detail: [rankAccess[rank.id], checklist ? `Participation totals required: ${checklist}.` : ""]
                .filter(Boolean).join(" "),
            };
          }),
          { label: "Participation totals", detail: "Activity carries forward between ranks. Repeat opens and shares of the same article count once, and each rated post, poll, and weekly quiz counts once. Either Current Events slider counts toward rating that post." },
          { label: "Graduation milestone", detail: `Reach ${count(graduationMilestonePoints)} lifetime points to receive ${graduationTokenCost} tokens once. After reaching Poster III, use those tokens or your existing tokens to purchase Graduation in Badge Quest.` },
          { label: "Publishing permissions", detail: "Current Events and Top Story are available only to accounts with the relevant publishing permission. Your composer shows the routes you can use." },
          { label: "Promotion bonuses", detail: "Reaching a new rank can award additional points. For example, Reader II awards 100, Poster I awards 350, and Poster II awards 1,000." },
        ],
      },
      {
        title: "Ways to earn points",
        entries: [
          { label: `+${articleReadPointValue} for a first article read`, detail: `Open the article while signed in. A profile owner can also earn +${profileVisitPointValue} for the first visit from another signed-in member.` },
          { label: `+${participationSharePointValue} for a first share-link visit and +${participationFavoritePointValue} for a favorite`, detail: "Share a post with its Share button. Points are awarded when an eligible reader opens your share link. Use the diamond to favorite a post. Removing the favorite reverses its reward." },
          { label: `+${currentEventTruthVotePointValue} for Current Events Truth and +${participationTruthVotePointValue} for Conspiracy Truth`, detail: "Vote on another member’s eligible post. Removing the vote reverses its reward. Relevance / Importance is a separate Current Events rating." },
          { label: `+${participationTicketPointValue} for a Conspiracy ticket and +${participationCommentPointValue} for a first eligible Conspiracy comment`, detail: "A removed ticket reverses its reward. Your own posts don’t earn participation rewards." },
          { label: "Daily Spin, Quiz, and Stamps", detail: "Spin in the Briefing Room for coins and lifetime points. Complete a weekly quiz or collect an eligible stamp in Exchange for more ways to earn." },
        ],
      },
    ],
  },
  {
    id: "exchange",
    label: "Exchange",
    intro: "Open Exchange from the Briefing Room. The balance rows show what you have and the exchange rate for each trade.",
    groups: [
      {
        title: "Trade",
        entries: [
          { label: `Get Coins · ${bayoCoinExchangeRate}:1`, detail: `Trade ${bayoCoinExchangeRate} available points for one Bayo Coin. Your lifetime total stays the same when you trade.` },
          { label: `Get Tokens · ${bayoTokenExchangeRate}:1`, detail: `Trade ${bayoTokenExchangeRate} Bayo Coins for one token. Starting with zero coins, that’s ${bayoCoinExchangeRate * bayoTokenExchangeRate} points per token.` },
        ],
      },
      {
        title: "Collect and unlock",
        entries: [
          { label: "Stamps", detail: `See each stamp’s coin or token price and its reward before buying. A first purchase usually gives ${count(defaultStampPointReward)} points. Some stamps are free or have different rewards, and owned stamps appear in your Trophy Case.` },
          { label: "Birthday stamp", detail: "Save your birthday month and day in Settings. The free Birthday stamp appears on your birthday in Pacific time." },
          { label: "Cards", detail: "After Graduation, spend coins on eligible cards. Open Cards to see what each one does and manage active cards." },
          { label: "Badge Quest", detail: `Graduation requires Poster III and costs ${graduationTokenCost} tokens. Badge Quest shows each badge’s requirements and price. The IMPOSSIBLE badge grants Poll and Weekly Quiz author access.` },
        ],
      },
    ],
    links: [{ label: "Open Exchange", href: "/briefing-room?panel=exchange" }],
  },
  {
    id: "participation",
    label: "Read & vote",
    intro: "Open a headline to read the post, follow its sources, and see the discussion and voting tools available for that feed.",
    groups: [
      {
        title: "On an article",
        entries: [
          { label: "Current Events ratings", detail: "Truth and Relevance / Importance are separate sliders. Choose a position and press Vote. You can have one vote on each scale. Choose Remove vote before casting a different one. Dots show where other readers voted after you vote." },
          { label: "Conspiracy truth voting", detail: "Sign in to cast a score from 0 to 11. Select the same score and choose Undo Vote to remove it." },
          { label: "Comments", detail: "Commenting unlocks at Poster I. Conspiracy and Library comments are free. Conspiracy comments can be removed during the first two minutes. Current Events comments cost one available point per character, including spaces and punctuation. The limit is 500 characters." },
          { label: "Save, share, and ticket", detail: "Use the green diamond to save a post in Briefing Room → Favorites. Use Share to pass along a link. When a ticket button is available, your ID Card shows whether you have a ticket to use." },
        ],
      },
      {
        title: "Polls and Weekly Quiz",
        entries: [
          { label: "Polls", detail: "At Poster I, cast one locked vote on an open poll for one Bayo Coin. Optional wagers unlock at Reader II." },
          { label: "Weekly Quiz", detail: "At Poster I, open Briefing Room → Quiz → Take Quiz. Each of the 36 slots is worth 50 points, or 100 at Poster III. Blank slots count as correct. Your first submission earns points, and you can review answers or try again for practice." },
        ],
      },
    ],
    links: [{ label: "Open Polls", href: "/polls" }, { label: "Open Weekly Quiz", href: "/briefing-room?panel=quiz" }],
  },
  {
    id: "posting",
    label: "Create a post",
    intro: "Open Create a post in the Briefing Room. Choose a route your account can use, add your material, and review the draft before publishing.",
    groups: [
      {
        title: "Choose a route",
        entries: [
          { label: "Conspiracy", detail: "Use it for theories, hypotheses, personal accounts, and unusual signals. Choose the category that fits, explain what you know, and distinguish evidence from speculation." },
          { label: "Current Events", detail: "Use it for factual news. Add a headline, category, and three short claims with a source for each." },
          { label: "Top Story", detail: "When available, write a scrolling ticker up to 100 characters and a report up to 1,200 characters, then add sources and review the preview." },
          { label: "Library", detail: "Use it for longer reading, documents, and archives. Include context and any sources a reader needs." },
        ],
      },
      {
        title: "Review before publishing",
        entries: [
          { label: "Sources and tags", detail: "Link to supporting material where you have it. Mark firsthand accounts clearly. Topic tags help people find public posts through Library search." },
          { label: "Anon and Incog", detail: "When available, Anon hides your displayed name on a public post. Incog keeps the post out of public feeds and uses a shelf label. Bay Space still records the post and its account." },
          { label: "Manage published posts", detail: "Go to My Posts in the Briefing Room to find your work and the controls available for each post." },
        ],
      },
      {
        title: "Conspiracy categories",
        entries: theoryIcebergCategories.map((category) => ({
          label: category.label,
          detail: category.description,
        })),
      },
    ],
    links: [{ label: "Open Briefing Room", href: "/briefing-room" }],
  },
  {
    id: "black-light",
    label: "Black Light",
    intro: "Black Light is where you work with Thiago inside Bay Space. Open it from its Briefing Room card or from Options.",
    groups: [
      {
        title: "Ask and investigate",
        entries: [
          { label: "🦉 Owl", detail: "Ask about site rules, how to earn points, your balances and rank, or a Bay Space article. Try “What are my stats?”" },
          { label: "🔍 Investigate", detail: "Search by topic or choose a Current Events or Conspiracy article from the dropdowns. Thiago uses saved Bay Space articles and the sources they list." },
        ],
      },
      {
        title: "Format and review drafts",
        entries: [
          { label: "📝 Format", detail: "Start with a headline and body for Conspiracy, or a headline and three short claims with one URL below each claim for Current Events. Review the formatted draft and send it to Paste & Go." },
          { label: "🌀 Paste & Go 🎢", detail: "Paste a prepared draft. Press Paste & Go or Command/Control + Enter to check it. Article and poll drafts show a review before publishing. Your permissions determine which draft types you can use." },
          { label: "Poll and Quiz drafts", detail: "IMPOSSIBLE badge holders can submit Poll and Weekly Quiz drafts. A complete quiz goes through a preview. Paste & Go submits an eligible single question directly to the next open slot. In Briefing Room → Quiz → Quiz Author Form, press Submit or Enter to save a question. Other authors can read it, and only you can edit or delete it. The quiz posts Sunday at 11:59 PM Pacific." },
        ],
      },
    ],
    links: [{ label: "Open Briefing Room", href: "/briefing-room" }],
  },
  {
    id: "account",
    label: "Account & privacy",
    intro: "Open Settings in the Briefing Room to manage your account and see the current Bay Space Privacy Notice and User Agreement.",
    groups: [
      {
        title: "Account controls",
        entries: [
          { label: "Password and profile", detail: "Use Change Password in Settings. Add optional profile links and choose which ones to display. Use the ID Card to set your code name." },
          { label: "Wipe Account", detail: "Use this to remove your posts while keeping your account and Explorer number. Read the confirmation before choosing Wipe." },
          { label: "Delete Account", detail: "Full Erase closes your account and retires its Explorer number. Review the confirmation and the User Agreement for how data is handled." },
        ],
      },
      {
        title: "Help and terms",
        entries: [
          { label: "Support", detail: "Email support with your account name or Explorer number and a short description. Keep your password private." },
          { label: "Privacy Notice and User Agreement", detail: "Read the current agreement for Bay Space’s rules, privacy practices, and how to get in touch." },
        ],
      },
    ],
    links: [
      { label: "Read the User Agreement", href: `${baySpaceAgreementHref}?returnTo=${encodeURIComponent("/library#how-to")}` },
      { label: "Email support", href: "mailto:bayoadmin@protonmail.com" },
    ],
  },
];
