import { defaultDailyFoodCategory } from "../../lib/daily-food-categories";
import type { BayPost } from "../../lib/bay-space-types";
import type { MonthlyIcebergSignal } from "../theories/monthly-iceberg-layout";

type Point = Pick<MonthlyIcebergSignal, "x" | "y">;

type CrestCategory = {
  category: string;
  anchor: Point;
  label: Point & { width: number };
  connectorSide: "left" | "right" | "bottom";
};

// Percentages on the mountain artwork. Labels and story signals share these anchors.
export const crestCategoryLayout: readonly CrestCategory[] = [
  { category: "Contact Readiness", anchor: { x: 50.5, y: 21.2 }, label: { x: 40.7, y: 13.6, width: 13 }, connectorSide: "right" },
  { category: "AI Emergence", anchor: { x: 55.1, y: 27.6 }, label: { x: 65.5, y: 15.5, width: 13.4 }, connectorSide: "left" },
  { category: "Space Capability", anchor: { x: 44.4, y: 33.8 }, label: { x: 33.6, y: 26.8, width: 12.9 }, connectorSide: "right" },
  { category: "Nuclear Posture", anchor: { x: 62.6, y: 42.1 }, label: { x: 73.4, y: 30.3, width: 12.8 }, connectorSide: "left" },
  { category: "Technology Leap Risk", anchor: { x: 32, y: 48.2 }, label: { x: 20.8, y: 38.3, width: 13.8 }, connectorSide: "right" },
  { category: "Conflict Intensity", anchor: { x: 71.4, y: 52.2 }, label: { x: 81.9, y: 44.2, width: 13.2 }, connectorSide: "left" },
  { category: "Survival Status", anchor: { x: 55.3, y: 55.8 }, label: { x: 47.1, y: 49.6, width: 11.1 }, connectorSide: "right" },
  { category: "Signal Output", anchor: { x: 25.7, y: 61.6 }, label: { x: 15.6, y: 51.5, width: 11.7 }, connectorSide: "right" },
  { category: "Climate Stability", anchor: { x: 71.7, y: 66.4 }, label: { x: 63.7, y: 59.6, width: 10.2 }, connectorSide: "right" },
  { category: "Extinction Proximity", anchor: { x: 79.5, y: 67.5 }, label: { x: 89.2, y: 59.2, width: 13.3 }, connectorSide: "left" },
  { category: "Biosphere Health", anchor: { x: 47.9, y: 74.1 }, label: { x: 47, y: 63.2, width: 11.5 }, connectorSide: "bottom" },
  { category: "Psychological Volatility", anchor: { x: 20.3, y: 74.6 }, label: { x: 10.8, y: 69.2, width: 14 }, connectorSide: "right" },
  { category: "Resource Burn Rate", anchor: { x: 53.5, y: 78.9 }, label: { x: 61.8, y: 73.7, width: 12.3 }, connectorSide: "left" },
  { category: "Governance Coherence", anchor: { x: 27.9, y: 79 }, label: { x: 36.6, y: 74, width: 13.1 }, connectorSide: "left" },
  { category: "Misc", anchor: { x: 76.5, y: 83.3 }, label: { x: 84.5, y: 89.4, width: 9.8 }, connectorSide: "left" },
  { category: "Containment Risk", anchor: { x: 44.1, y: 83.6 }, label: { x: 54, y: 89.8, width: 13.6 }, connectorSide: "left" },
  { category: "Observation Priority", anchor: { x: 25.4, y: 85.4 }, label: { x: 15.1, y: 90.2, width: 14 }, connectorSide: "right" },
];

const anchors = new Map(crestCategoryLayout.map(({ category, anchor }) => [category, anchor]));
const miscAnchor = crestCategoryLayout.find(({ category }) => category === defaultDailyFoodCategory)!.anchor;

function placeStory(anchor: Point, placed: Point[]): Point {
  const inward = anchor.x < 52 ? 1 : -1;
  const alongSlope = anchor.y < 78 ? 1 : -1;
  let best = anchor;
  let bestClearance = -1;

  for (let attempt = 0; attempt < 48; attempt++) {
    // Start at the exact category anchor, then look for nearby room inside the crest.
    const candidate = attempt === 0 ? anchor : {
      x: anchor.x + inward * (((attempt * 0.618034 + placed.length * 0.754878) % 1) * 5 - 0.75),
      y: anchor.y + alongSlope * (((attempt * 0.414214 + placed.length * 0.56984) % 1) * 7),
    };
    const clearance = placed.reduce((nearest, point) => Math.min(nearest,
      (candidate.x - point.x) ** 2 + ((candidate.y - point.y) / 3) ** 2,
    ), Infinity);

    if (clearance >= 3 ** 2) return candidate;
    if (clearance > bestClearance) {
      best = candidate;
      bestClearance = clearance;
    }
  }

  return best;
}

export function getCrestSignals(
  posts: readonly BayPost[],
  getCategory: (post: BayPost) => string,
): MonthlyIcebergSignal[] {
  const placed: MonthlyIcebergSignal[] = [];
  const chronological = [...posts].sort(
    (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id.localeCompare(right.id),
  );

  // Lay out older stories first so incoming stories don't shift existing lights.
  for (const post of chronological) {
    const name = getCategory(post);
    const anchor = anchors.get(name);
    placed.push({
      id: post.id,
      title: post.title,
      category: anchor ? name : defaultDailyFoodCategory,
      ...placeStory(anchor ?? miscAnchor, placed),
    });
  }

  const byId = new Map(placed.map(signal => [signal.id, signal]));
  return posts.map(({ id }) => byId.get(id)!);
}
