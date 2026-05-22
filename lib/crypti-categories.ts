export type CryptiCategory = {
  description: string;
  id: string;
  label: string;
};

export const cryptiCategories: CryptiCategory[] = [
  {
    id: "rocket-fuel",
    label: "Rocket Fuel",
    description: "Volume + momentum hitting together.",
  },
  {
    id: "whale-footprints",
    label: "Whale Footprints",
    description: "Big wallets moving in.",
  },
  {
    id: "zombie-coins",
    label: "Zombie Coins",
    description: "Dead coins suddenly waking up.",
  },
  {
    id: "cult-heat",
    label: "Cult Heat",
    description: "Community going feral.",
  },
  {
    id: "clean-launches",
    label: "Clean Launches",
    description: "New projects without obvious rug stink.",
  },
  {
    id: "narrative-surf",
    label: "Narrative Surf",
    description: "Riding today's hot theme.",
  },
  {
    id: "low-cap-sparks",
    label: "Low Cap Sparks",
    description: "Tiny caps with movement.",
  },
  {
    id: "exchange-bait",
    label: "Exchange Bait",
    description: "Looks listable soon.",
  },
  {
    id: "panic-rebounds",
    label: "Panic Rebounds",
    description: "Oversold stuff snapping back.",
  },
  {
    id: "quiet-accumulation",
    label: "Quiet Accumulation",
    description: "Boring chart, smart wallets buying.",
  },
  {
    id: "degen-sirens",
    label: "Degen Sirens",
    description: "Risky but loud.",
  },
  {
    id: "trap-zone",
    label: "Trap Zone",
    description: "Hypey but dangerous.",
  },
  {
    id: "blue-chip-muscle",
    label: "Blue-Chip Muscle",
    description: "BTC/ETH/SOL-type strength.",
  },
  {
    id: "meme-furnace",
    label: "Meme Furnace",
    description: "Memecoins cooking hard.",
  },
];

export const defaultCryptiCategory = "rocket-fuel";

export function getCryptiCategory(categoryId: string) {
  return cryptiCategories.find((category) => category.id === categoryId);
}

export function getCryptiCategoryLabel(categoryId: string) {
  if (categoryId === "todays-smoke") {
    return "Today's Smoke";
  }

  return getCryptiCategory(categoryId)?.label ?? "Rocket Fuel";
}

export function isCryptiCategory(categoryId: string) {
  return cryptiCategories.some((category) => category.id === categoryId);
}
