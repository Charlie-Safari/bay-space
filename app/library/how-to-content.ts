import { baySpaceAgreementHref } from "../../lib/bay-space-agreement";
import {
  bayRanks,
  bayoCoinExchangeRate,
  bayoTokenExchangeRate,
  defaultStampPointReward,
  graduationTokenCost,
} from "../../lib/bay-space-ranks";
import {
  articleReadPointValue,
  currentEventTruthVotePointValue,
  participationCommentPointValue,
  participationFavoritePointValue,
  participationSharePointValue,
  participationTicketPointValue,
  participationTruthVotePointValue,
  profileVisitPointValue,
} from "../../lib/bay-space-scoring";

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
  reader: "Browse the public feeds and participate as a member.",
  "reader-ii": "Unlock Library submissions for reading.",
  poster: "Unlock Conspiracy posting.",
  "poster-ii": "Unlock Library posting alongside Conspiracy.",
  "poster-iii": "Keep Conspiracy and Library posting and unlock the Incog control.",
  graduation: "Unlock Cards and the next Badge Quest purchases.",
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
          { label: "Know Something", detail: "Open Current Events for sourced news and Top Story." },
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
          { label: "Current Events", detail: "Open the top tab or the right half of the Briefing Room card. Use the date, category, and sort controls to browse the feed. Top Story has its own view." },
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
          { label: "Daily Spin", detail: "Open the slot machine once a day to earn 50–500 points. The spin resets by Pacific date." },
          { label: "Create a post and Paste & Go", detail: "Both shortcuts are visible from the start. On the standard rank path, earn 1,000 lifetime points to reach Poster I. If a shortcut is locked, it shakes and shows the requirement." },
          { label: "Circles and article feeds", detail: "Open Circles to view your circles and connections. The split card opens Conspiracy Theories and Current Events." },
          { label: "Black Light and Exchange", detail: "Open Black Light to ask Thiago. Under Exchange you’ll see Lifetime Points, available Points, Coins, and Tokens. The card below shows your rank and progress." },
        ],
      },
      {
        title: "Options",
        entries: [
          { label: "Inbox and Quiz", detail: "Open your conversations in Inbox. Choose Quiz and then Take Quiz for this week’s Current Events questions." },
          { label: "Favorites, Stats, and My Posts", detail: "Find saved posts, check activity, and manage your published work." },
          { label: "ID Card and Profile", detail: "Expand ID Card to see your Explorer number, code name, rank, lifetime points, and vote tickets. Profile opens your public page." },
          { label: "Settings and Sign Out", detail: "Open Settings for password, profile links, and account controls. Use Back or the Bay Space logo to return to the main Briefing Room." },
        ],
      },
    ],
    links: [{ label: "Open Briefing Room", href: "/briefing-room" }],
  },
  {
    id: "points",
    label: "Ranks & points",
    intro: "Lifetime points track rank. Available points are your spendable balance. A post’s public score is separate from both.",
    groups: [
      {
        title: "The standard rank path",
        entries: [
          ...bayRanks.map((rank) => ({
            label: `${rank.id === "poster" ? "Poster I" : rank.label} · ${rank.id === "graduation" ? `${graduationTokenCost} tokens` : `${count(rank.minLifetimePoints)} lifetime points`}`,
            detail: rankAccess[rank.id],
          })),
          { label: "Publishing permissions", detail: "Current Events and Top Story are available only to accounts with the relevant publishing permission. Your composer shows the routes you can use." },
          { label: "Promotion bonuses", detail: "Reaching a new rank can award additional points. For example, Reader II awards 100, Poster I awards 350, and Poster II awards 1,000." },
        ],
      },
      {
        title: "Ways to earn points",
        entries: [
          { label: `+${articleReadPointValue} for a first article read`, detail: `A profile owner can also earn +${profileVisitPointValue} for the first visit from another signed-in member.` },
          { label: `+${participationSharePointValue} for a first share and +${participationFavoritePointValue} for a favorite`, detail: "Use the post’s Share and diamond controls. Removing a favorite reverses its reward." },
          { label: `+${currentEventTruthVotePointValue} for Current Events Truth and +${participationTruthVotePointValue} for Conspiracy Truth`, detail: "Vote on another member’s eligible post. Removing the vote reverses its reward. Relevance / Importance is a separate Current Events rating." },
          { label: `+${participationTicketPointValue} for a Conspiracy ticket and +${participationCommentPointValue} for a first eligible Conspiracy comment`, detail: "A removed ticket reverses its reward. Your own posts don’t earn participation rewards." },
          { label: "Daily Spin, Quiz, and Stamps", detail: "Spin in the Briefing Room, complete a weekly quiz, or collect an eligible stamp in Exchange for more ways to earn." },
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
          { label: "Badge Quest", detail: `Graduation costs ${graduationTokenCost} tokens. Badge Quest shows each badge’s requirements and price. The IMPOSSIBLE badge grants Poll and Weekly Quiz author access.` },
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
          { label: "Conspiracy truth voting", detail: "Conspiracy uses a separate numeric truth scale. Cast a score with Vote. Voting again at the same score removes it." },
          { label: "Comments", detail: "Conspiracy comments are free and have a two-minute removal window. Current Events comments require sign-in and cost one available point per character, including internal spaces and punctuation. Both have a 500-character limit." },
          { label: "Save, share, and ticket", detail: "Use the green diamond to save a post in Briefing Room → Favorites. Use Share to pass along a link. When a ticket button is available, your ID Card shows whether you have a ticket to use." },
        ],
      },
      {
        title: "Polls and Weekly Quiz",
        entries: [
          { label: "Polls", detail: "Sign in to cast one locked vote on an open poll. Voting costs one Bayo Coin. The poll shows any optional wager before you submit." },
          { label: "Weekly Quiz", detail: "Open Briefing Room → Quiz → Take Quiz. A finished quiz has 36 slots worth 50 points each. Blank slots count as bonus answers. Your first submission earns points, and you can review answers or try again for practice." },
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
          { label: "Poll and Quiz drafts", detail: "IMPOSSIBLE badge holders can submit Poll and Weekly Quiz drafts. A complete quiz goes through a preview, while an eligible single quiz question is added directly to the shared draft." },
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
