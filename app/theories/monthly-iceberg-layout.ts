import type { BayPost } from "../../lib/bay-space-types";
import {
  doesTheoryCategoryMatch,
  theoryIcebergCategories,
} from "../../lib/theory-categories";

export type MonthlyIcebergSignal = {
  id: string;
  title: string;
  category: string;
  x: number;
  y: number;
};

type Point = Pick<MonthlyIcebergSignal, "x" | "y">;

// Interior edges of the detailed iceberg art, measured as percentages.
// Entries follow the Categories map from above the waterline down to the abyss.
const layerXBounds = [
  [32, 70],
  [25, 77],
  [18, 81],
  [21, 77],
  [23, 75],
  [25, 72],
  [28, 68],
  [30, 66],
  [33, 63],
  [35, 61],
  [37, 59],
  [39, 57],
] as const;
const rareSignalsLayer = theoryIcebergCategories.findIndex(
  ({ label }) => label === "Rare Signals",
);

function getLayer(post: BayPost) {
  const category = post.meta?.theoryCategory;
  const layer = typeof category === "string"
    ? theoryIcebergCategories.findIndex(({ label }) => doesTheoryCategoryMatch(category, label))
    : -1;
  return layer === -1 ? rareSignalsLayer : layer;
}

function createRandom(seed: string) {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value = Math.imul(value ^ seed.charCodeAt(index), 16777619);
  }
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 2 ** 32;
  };
}

function placeSignal(layer: number, random: () => number, nearby: Point[]): Point {
  const [left, right] = layerXBounds[layer];
  const center = 21 + (layer - 1) * 6;
  let best: Point | undefined;
  let bestClearance = -1;

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const depth = random();
    // The crest is narrower toward its peak; the submerged bands are 6% high.
    const inset = layer === 0 ? (1 - depth) * 9 : 0;
    const point = {
      x: left + inset + random() * (right - left - inset * 2),
      y: layer === 0 ? 9.5 + depth * 5.75 : center + (depth - 0.5) * (layer === 1 ? 3.2 : 4.4),
    };
    const clearance = nearby.reduce((nearest, placed) => Math.min(
      nearest,
      (point.x - placed.x) ** 2 + ((point.y - placed.y) * 1.5) ** 2,
    ), Infinity);

    if (clearance >= 7 ** 2) return point;
    if (clearance > bestClearance) {
      best = point;
      bestClearance = clearance;
    }
  }

  return best!;
}

export function getMonthlyIcebergSignals(posts: readonly BayPost[]): MonthlyIcebergSignal[] {
  const byLayer: Point[][] = layerXBounds.map(() => []);
  const signals = new Map<string, MonthlyIcebergSignal>();
  // Lay out older stories first, so incoming stories do not move existing lights.
  const chronological = [...posts].sort(
    (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id.localeCompare(right.id),
  );

  for (const post of chronological) {
    const layer = getLayer(post);
    const nearby = [...(byLayer[layer - 1] ?? []), ...byLayer[layer], ...(byLayer[layer + 1] ?? [])];
    const point = placeSignal(layer, createRandom(post.id), nearby);
    byLayer[layer].push(point);
    signals.set(post.id, { id: post.id, title: post.title, category: theoryIcebergCategories[layer].label, ...point });
  }

  return posts.map(({ id }) => signals.get(id)!);
}
