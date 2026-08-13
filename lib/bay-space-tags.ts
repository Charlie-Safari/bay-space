import type { BayPost } from "./bay-space-types";

type TopicTagPost = Pick<BayPost, "meta">;

function cleanTopicTag(tag: string) {
  const cleanedTag = tag
    .trim()
    .replace(/^[,;]+|[,;.]+$/g, "")
    .replace(/^#+/, "#")
    .trim();

  return cleanedTag && !cleanedTag.startsWith("#") ? `#${cleanedTag}` : cleanedTag;
}

function topicTagSearchText(tag: string) {
  const withoutHash = tag.replace(/^#/, "");

  return [tag, withoutHash, withoutHash.replace(/[+_-]+/g, " ")]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeSearchPhrase(value: string) {
  return value
    .toLowerCase()
    .replace(/[#]+/g, "")
    .replace(/[+_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getPostTopicTags(post: TopicTagPost) {
  const topicTags = post.meta?.topicTags;
  const rawTags = Array.isArray(topicTags)
    ? topicTags
    : typeof topicTags === "string"
      ? (topicTags.match(/#[^\s#]+/g) ?? topicTags.split(/[,;\n]+/))
      : [];

  return rawTags
    .filter((tag): tag is string => typeof tag === "string")
    .map(cleanTopicTag)
    .filter(Boolean);
}

export function getPostTopicTagSearchText(post: TopicTagPost) {
  return getPostTopicTags(post).map(topicTagSearchText).join(" ");
}

export function doPostTopicTagsMatchQuery(post: TopicTagPost, query: string) {
  const normalizedQuery = normalizeSearchPhrase(query);

  if (!normalizedQuery) {
    return false;
  }

  const tagSearchText = getPostTopicTagSearchText(post);
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  return (
    tagSearchText.includes(normalizedQuery) ||
    queryWords.every((word) => tagSearchText.includes(word))
  );
}

export function getMatchingPostTopicTags(post: TopicTagPost, query: string) {
  const normalizedQuery = normalizeSearchPhrase(query);
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  if (!normalizedQuery) {
    return getPostTopicTags(post);
  }

  return getPostTopicTags(post).filter((tag) => {
    const tagSearchText = topicTagSearchText(tag);

    return (
      tagSearchText.includes(normalizedQuery) ||
      queryWords.every((word) => tagSearchText.includes(word))
    );
  });
}
