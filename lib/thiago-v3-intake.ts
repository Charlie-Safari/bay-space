import { dailyFoodCategories } from "./daily-food-categories";
import { theoryCategories } from "./theory-categories";
import { validateQuizDraft, type QuizDraft } from "./bay-space-quiz-format";

type ArticleDraft = {
  kind: "article";
  category: "daily-food" | "theory";
  title: string;
  body: string;
  section: string;
  sources: string[];
  tagSources: string[];
  tags: string[];
  topicTags: string;
  skepticDebunkEvidence: string;
};
type PollDraft = { kind: "poll"; question: string; options: string[] };
type WeeklyQuizDraft = { kind: "quiz"; draft: QuizDraft };
export type ThiagoIntake = ArticleDraft | PollDraft | WeeklyQuizDraft;

function fail(message: string): never { throw new Error(message); }
function lineValue(text: string, label: string) {
  return text.split("\n").find(line => line.trim().toLowerCase().startsWith(`${label.toLowerCase()}:`))?.trim().slice(label.length + 1).trim() ?? "";
}
function validUrl(value: string) {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}
function cleanInput(input: string) {
  return input.trim().replace(/^```(?:text|json)?\s*\n/i, "").replace(/\n```\s*$/, "").trim();
}

export function parseThiagoV3(input: string): ThiagoIntake | null {
  const text = cleanInput(input);
  if (!text) fail("Paste a Black Light draft first.");
  if (text.startsWith("{")) {
    let object: unknown;
    try { object = JSON.parse(text); } catch { fail("JSON is incomplete or invalid. Check the pasted block."); }
    if (!object || typeof object !== "object") fail("Expected a Poll or Quiz object.");
    const value = object as Record<string, unknown>;
    if (value.type === "poll") {
      if (value.version !== 3) fail("Poll drafts must use version 3.");
      const question = typeof value.question === "string" ? value.question.trim() : "";
      const options = Array.isArray(value.options) ? value.options : [];
      if (!question || question.length > 150) fail("Poll question must be 1–150 characters.");
      if (options.length < 2 || options.length > 3 || options.some(option => typeof option !== "string" || !option.trim() || option.trim().length > 80)) fail("Poll needs two or three answers, each 1–80 characters.");
      const cleaned = options.map((option: string) => option.trim());
      if (new Set(cleaned.map((option: string) => option.toLowerCase())).size !== cleaned.length) fail("Poll answers must differ.");
      return { kind: "poll", question, options: cleaned };
    }
    if (value.type === "quiz" || ("title" in value && "weekStart" in value && "questions" in value)) {
      return { kind: "quiz", draft: validateQuizDraft(value) };
    }
    fail("JSON route missing. Use type: poll, or a complete weekly quiz draft.");
  }

  const route = lineValue(text, "Route").toLowerCase();
  if (!route) return null; // Existing article drafts continue through the legacy parser.
  if (!['conspiracy', 'current events'].includes(route)) fail("Route must be Conspiracy or Current Events.");
  const category = route === "conspiracy" ? "theory" : "daily-food";
  const rawSection = lineValue(text, "Category");
  const labels: readonly string[] = category === "theory" ? theoryCategories.map(item => item.label) : dailyFoodCategories;
  const section = rawSection || (category === "theory" ? "Rare Signals" : "Misc");
  if (!labels.includes(section)) fail(`Unknown ${route} category: ${section}.`);
  const title = lineValue(text, "Headline");
  if (!title || title.length > 75) fail("Headline must be 1–75 characters.");
  const topicTags = lineValue(text, "Topic Tags");
  const lines = text.split("\n");
  if (category === "daily-food") {
    const tags: string[] = []; const tagSources: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const tagAt = lines.findIndex(line => new RegExp(`^\\s*Tag ${i}:`, "i").test(line));
      if (tagAt < 0) fail(`Tag ${i} is missing.`);
      const tag = lines[tagAt].replace(/^\s*Tag \d+:\s*/i, "").trim();
      if (!tag || tag.length > 150) fail(`Tag ${i} must be 1–150 characters.`);
      const next = lines[tagAt + 1]?.match(/^\s*Source link:\s*(.+)\s*$/i)?.[1]?.trim() ?? "";
      if (!validUrl(next)) fail(`Tag ${i} needs a valid Source link immediately below it.`);
      tags.push(tag); tagSources.push(next);
    }
    return { kind: "article", category, title, section, body: tags.join("\n"), tags, tagSources, sources: [...new Set(tagSources)], topicTags, skepticDebunkEvidence: "" };
  }
  const bodyStart = lines.findIndex(line => /^\s*Body:\s*$/i.test(line));
  if (bodyStart < 0) fail("Conspiracy Body section is missing.");
  const boundary = /^(?:Topic Tags|Sources|Skeptic\s*\/\s*Debunk Evidence):/i;
  let bodyEnd = bodyStart + 1;
  while (bodyEnd < lines.length && !boundary.test(lines[bodyEnd].trim())) bodyEnd++;
  const body = lines.slice(bodyStart + 1, bodyEnd).join("\n").trim();
  if (!body || body.length > 50_000) fail("Conspiracy body must be 1–50,000 characters. No text was trimmed.");
  const skepticStart = lines.findIndex(line => /^\s*Skeptic\s*\/\s*Debunk Evidence:/i.test(line));
  let skepticDebunkEvidence = "";
  if (skepticStart >= 0) {
    let end = skepticStart + 1;
    while (end < lines.length && !/^(?:Topic Tags|Sources):/i.test(lines[end].trim())) end++;
    skepticDebunkEvidence = [lines[skepticStart].replace(/^\s*Skeptic\s*\/\s*Debunk Evidence:\s*/i, ""), ...lines.slice(skepticStart + 1, end)].join("\n").trim();
  }
  const sourcesStart = lines.findIndex(line => /^\s*Sources:\s*$/i.test(line));
  const sources = sourcesStart < 0 ? [] : lines.slice(sourcesStart + 1).map(line => line.trim()).filter(Boolean);
  if (sources.some(source => !validUrl(source))) fail("Every Conspiracy source must be a full http or https URL.");
  const fullBody = skepticDebunkEvidence ? `${body}\n\nSKEPTIC / DEBUNK EVIDENCE:\n${skepticDebunkEvidence}` : body;
  if (fullBody.length > 50_000) fail("Conspiracy body and research exceed 50,000 characters. No text was trimmed.");
  return { kind: "article", category, title, section, body: fullBody, tags: [], tagSources: [], sources, topicTags, skepticDebunkEvidence };
}
