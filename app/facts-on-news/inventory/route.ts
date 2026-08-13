import {
  getStorageErrorMessage,
  listPosts,
} from "../../../lib/bay-space-db";
import { getPostTopicTags } from "../../../lib/bay-space-tags";
import { defaultDailyFoodCategory } from "../../../lib/daily-food-categories";
import { getSiteUrl } from "../../../lib/site-url";
import type { BayPost } from "../../../lib/bay-space-types";

export const dynamic = "force-dynamic";

type FactsInventoryItem = {
  articleTags: string[];
  category: string;
  dateKey: string;
  daysAgo: number;
  duplicateCheckText: string;
  headline: string;
  id: string;
  publishedAt: string;
  sourceDomains: string[];
  sourceUrls: string[];
  storyAgeBucket: string;
  storyFingerprint: string;
  summary: string;
  topicTags: string[];
  url: string;
};

function getMetaString(post: BayPost, key: string) {
  const value = post.meta?.[key];

  return typeof value === "string" ? value : "";
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function getArticleTags(post: BayPost) {
  const tags = getStringArray(post.meta?.tags);

  if (tags.length) {
    return tags.map((tag) => tag.trim()).filter(Boolean);
  }

  return post.body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getSourceUrls(post: BayPost) {
  const sourceUrls = [
    ...getStringArray(post.meta?.sourceLinks),
    ...getStringArray(post.meta?.tagSources),
    ...getStringArray(post.meta?.sources),
  ].map((source) => source.trim());

  return Array.from(new Set(sourceUrls.filter(Boolean)));
}

function getSourceDomain(source: string) {
  try {
    const url = new URL(
      source.startsWith("http://") || source.startsWith("https://")
        ? source
        : `https://${source}`,
    );

    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getDaysAgo(publishedAt: string, generatedAt: Date) {
  const publishedDate = new Date(publishedAt);
  const millisecondsAgo = generatedAt.getTime() - publishedDate.getTime();
  const daysAgo = Math.floor(millisecondsAgo / 86_400_000);

  return Number.isFinite(daysAgo) ? Math.max(0, daysAgo) : 0;
}

function getStoryAgeBucket(daysAgo: number) {
  if (daysAgo <= 0) {
    return "today";
  }

  if (daysAgo <= 3) {
    return "last-3-days";
  }

  if (daysAgo <= 7) {
    return "last-7-days";
  }

  if (daysAgo <= 14) {
    return "last-14-days";
  }

  return "older";
}

function normalizeFingerprintText(value: string) {
  return value
    .toLowerCase()
    .replace(/#/g, "")
    .replace(/[+_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value: string) {
  return normalizeFingerprintText(value).replace(/\s+/g, "-").slice(0, 160);
}

function summarizePost(post: BayPost, articleTags: string[]) {
  const summarySource = articleTags.length ? articleTags.join(" ") : post.body;

  return summarySource.replace(/\s+/g, " ").trim().slice(0, 700);
}

function buildInventoryItem(
  post: BayPost,
  generatedAt: Date,
  siteUrl: string,
): FactsInventoryItem {
  const articleTags = getArticleTags(post);
  const topicTags = getPostTopicTags(post);
  const sourceUrls = getSourceUrls(post);
  const sourceDomains = Array.from(
    new Set(sourceUrls.map(getSourceDomain).filter(Boolean)),
  );
  const category = getMetaString(post, "dailyFoodCategory") || defaultDailyFoodCategory;
  const summary = summarizePost(post, articleTags);
  const duplicateCheckText = [
    post.title,
    category,
    topicTags.join(" "),
    articleTags.join(" "),
    sourceDomains.join(" "),
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const storyFingerprint =
    slugify([category, topicTags.join(" "), post.title].join(" ")) ||
    slugify(post.id);
  const daysAgo = getDaysAgo(post.createdAt, generatedAt);

  return {
    articleTags,
    category,
    dateKey: post.dateKey,
    daysAgo,
    duplicateCheckText,
    headline: post.title,
    id: post.id,
    publishedAt: post.createdAt,
    sourceDomains,
    sourceUrls,
    storyAgeBucket: getStoryAgeBucket(daysAgo),
    storyFingerprint,
    summary,
    topicTags,
    url: `${siteUrl}/facts-on-news#post-${post.id}`,
  };
}

export async function GET() {
  try {
    const generatedAt = new Date();
    const siteUrl = getSiteUrl();
    const posts = await listPosts("daily-food");
    const inventoryPosts = posts
      .filter((post) => !post.incognito)
      .map((post) => buildInventoryItem(post, generatedAt, siteUrl));

    return Response.json(
      {
        canonicalUrl: `${siteUrl}/facts-on-news`,
        duplicateCheckWindowsDays: [1, 3, 7, 14, 30],
        duplicatePrevention:
          "Compare proposed stories against headline, storyFingerprint, topicTags, summary, sourceDomains, dateKey, and daysAgo before drafting.",
        generatedAt: generatedAt.toISOString(),
        inventoryUrl: `${siteUrl}/facts-on-news/inventory`,
        posts: inventoryPosts,
        recommendedDuplicateWindowDays: 7,
        scope: "facts-on-news",
        totalPosts: inventoryPosts.length,
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    const storageMessage = getStorageErrorMessage(error);

    if (storageMessage) {
      console.error(storageMessage);
      return Response.json({ message: storageMessage }, { status: 503 });
    }

    console.error(error);
    return Response.json(
      { message: "Unable to load Facts on News inventory" },
      { status: 500 },
    );
  }
}
