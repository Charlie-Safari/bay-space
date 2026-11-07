"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BayPost } from "../../lib/bay-space-types";
import { formatThiagoDraft, type ThiagoArticleRoute } from "../../lib/thiago-format";
import { answerThiagoHelp, type ThiagoMemberStats } from "../../lib/thiago-help";
import styles from "./briefing-room.module.css";

const actionClass = "w-fit border border-[#39ff14] px-3 py-2 text-sm font-bold text-[#d7ffd0] disabled:opacity-50";
const fieldClass = "w-full border border-[#1d7f12] px-3 py-2 text-sm text-[#d7ffd0]";
const ignoredWords = new Set(["about", "article", "does", "from", "have", "tell", "that", "this", "what", "where", "which", "with", "would"]);
const investigationGroups = [
  { name: "Current Events", categories: ["daily-food", "top-story"] },
  { name: "Conspiracy", categories: ["theory"] },
];
const investigationCategories = new Set(investigationGroups.flatMap(({ categories }) => categories));

function wordsIn(text: string) {
  return new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

function countMatches(text: string, words: Set<string>) {
  return [...wordsIn(text)].filter((word) => words.has(word)).length;
}

function ThiagoReply({ text }: { text: string }) {
  const [visibleText, setVisibleText] = useState("");
  const replyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const characters = Array.from(text);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Keep long excerpts readable without typing thousands of letters one by one.
    const step = reducedMotion ? characters.length : Math.max(1, Math.ceil(characters.length / 140));
    let position = 0;
    let timer = window.setTimeout(typeNext, reducedMotion ? 0 : 260);

    function typeNext() {
      position = Math.min(position + step, characters.length);
      setVisibleText(characters.slice(0, position).join(""));
      if (position < characters.length) {
        const lastCharacter = characters[position - 1];
        const pause = /[,.!?\n]/.test(lastCharacter) ? 120 : Math.random() < 0.12 ? 90 : 0;
        timer = window.setTimeout(typeNext, 32 + Math.random() * 58 + pause);
      }
    }

    return () => window.clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    const replyBox = replyRef.current;
    if (replyBox) replyBox.scrollTop = replyBox.scrollHeight;
  }, [visibleText]);

  return (
    <div ref={replyRef} className="min-h-24 max-h-64 overflow-y-auto font-mono leading-relaxed">
      <p aria-hidden="true" className="whitespace-pre-wrap break-words">
        {visibleText}<span className={styles.thiagoCursor} />
      </p>
      <p role="status" className="sr-only">{visibleText === text ? text : ""}</p>
    </div>
  );
}

export function ThiagoArticleTools({
  mode, memberNumber, memberStats, posts, getSources,
}: {
  mode: "chat" | "investigate";
  memberNumber: string;
  memberStats: ThiagoMemberStats | null;
  posts: BayPost[];
  getSources: (post: BayPost) => string[];
}) {
  const [articleId, setArticleId] = useState("");
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<{ mode: typeof mode; turn: number; text: string } | null>(null);
  const isInvestigating = mode === "investigate";
  const searchPosts = isInvestigating
    ? posts.filter((post) => investigationCategories.has(post.category))
    : posts;
  const article = searchPosts.find((post) => post.id === articleId);
  const sources = isInvestigating && article ? [...new Set(getSources(article))] : [];
  const openingMessage = isInvestigating
    ? "Search the library for a topic, or choose an article below."
    : `Greetings explorer ${memberNumber}`;
  const activeReply = reply?.mode === mode ? reply : null;

  function answerQuestion() {
    const prompt = question.trim();
    if (!prompt) return;

    function respond(text: string) {
      setReply((previous) => ({ mode, turn: (previous?.turn ?? 0) + 1, text }));
      setQuestion("");
    }

    const help = isInvestigating ? null : answerThiagoHelp(prompt, memberStats);
    if (help) {
      respond(help);
      return;
    }

    const words = new Set([...wordsIn(prompt)].filter((word) => word.length > 2 && !ignoredWords.has(word)));
    const titleMatch = isInvestigating && article ? undefined : searchPosts
      .map((post) => ({ post, matches: countMatches(post.title, words) }))
      .filter(({ matches }) => matches > 0)
      .sort((left, right) => right.matches - left.matches)[0]?.post;
    const topicMatch = !titleMatch && !article && words.size ? searchPosts
      .map((post) => ({ post, matches: countMatches(post.body, words) }))
      .filter(({ matches }) => matches > 0)
      .sort((left, right) => right.matches - left.matches)[0]?.post : undefined;
    const context = titleMatch ?? article ?? topicMatch;
    if (!context) {
      respond(isInvestigating
        ? "I couldn't find that topic. Try another phrase or choose an article below."
        : "Ask me about your stats, Bay Space’s rules, or an article by headline. The How To Library has more site help.");
      return;
    }

    setArticleId(context.id);
    const contextSources = [...new Set(getSources(context))];
    const passages = context.body.split(/\n+|(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean);
    const matches = passages.map((passage) => ({
      passage,
      matches: countMatches(passage, words),
    })).filter((entry) => entry.matches > 0).sort((left, right) => right.matches - left.matches);
    const excerpts = /\b(?:summary|summarize|overview)\b/i.test(prompt) || (titleMatch && !matches.length)
      ? passages.slice(0, 3)
      : matches.slice(0, 3).map((entry) => entry.passage);
    const answer = /\b(?:sources?|links?)\b/i.test(prompt)
      ? contextSources.length ? "Listed sources:\n" + contextSources.join("\n") : "This article has no listed sources."
      : excerpts.length
        ? "From the article:\n" + excerpts.join("\n\n")
        : "I couldn't find a matching passage. Try a name or phrase from the article, or ask for an overview.";
    respond(`${context.title}\n\n${answer}`);
  }

  return (
    <div className="mt-4 grid gap-3 rounded-xl border border-[#72c16a]/35 p-3 text-[#dce9d9] sm:p-4">
      <p className="text-sm text-[#9abc96]">
        {isInvestigating
          ? "Investigate · Examine a Bay Space article and the sources it lists."
          : "Owl · Ask Thiago about Bay Space, your stats, or an article."}
      </p>
      <div role="region" aria-label="Thiago reply" className="space-y-3 rounded-lg border border-[#72c16a]/30 bg-black/30 p-3 text-sm">
        <p className="font-bold text-[#d7ffd0]">Thiago</p>
        <ThiagoReply key={`${mode}:${activeReply?.turn ?? openingMessage}`} text={activeReply?.text ?? openingMessage} />
        {isInvestigating && article ? (
          <details className="max-h-60 overflow-y-auto rounded-lg border border-[#72c16a]/25 p-2">
            <summary className="cursor-pointer break-words">{article.title} · Article and listed sources</summary>
            <p className="mt-2 whitespace-pre-wrap break-words">{article.body}</p>
            {sources.length ? (
              <ul className="mt-2 grid gap-1">
                {sources.map((source) => (
                  <li key={source} className="break-all">
                    <a className="underline" target="_blank" rel="noopener noreferrer"
                      href={/^https?:\/\//i.test(source) ? source : `https://${source}`}>
                      {source}
                    </a>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2">No sources listed.</p>}
          </details>
        ) : null}
      </div>
      <form className="grid gap-2" onSubmit={(event) => { event.preventDefault(); answerQuestion(); }}>
        <textarea aria-label="Ask Thiago" rows={3} className={fieldClass} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={isInvestigating ? "Search for a topic or ask about a claim" : "Type to Thiago"} />
        <button type="submit" className={actionClass} disabled={!question.trim()}>Ask Thiago</button>
      </form>
      {isInvestigating ? (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {investigationGroups.map(({ name, categories }) => (
            <label key={name} className="grid min-w-0 gap-1 text-sm">
              {name}
              <select className={fieldClass} value={article && categories.includes(article.category) ? articleId : ""} onChange={(event) => {
                setArticleId(event.target.value);
                setReply(null);
              }}>
                <option value="">Choose an article</option>
                {searchPosts.filter((post) => categories.includes(post.category)).map((post) => (
                  <option key={post.id} value={post.id}>{post.title}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}
      {isInvestigating ? (
        <p className="text-xs text-[#9abc96]">Using saved Bay Space articles and their listed sources.</p>
      ) : (
        <Link href="/library#how-to" className="w-fit text-xs text-[#9abc96] underline">How To Library</Link>
      )}
    </div>
  );
}

export function ThiagoFormatter({
  routes, input, onInput, onUse,
}: {
  routes: ThiagoArticleRoute[];
  input: string;
  onInput: (input: string) => void;
  onUse: (formatted: string) => void;
}) {
  const [route, setRoute] = useState<ThiagoArticleRoute>(routes[0] ?? "theory");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  return (
    <form className="mt-4 grid gap-3 text-[#dce9d9]" onSubmit={(event) => {
      event.preventDefault();
      setError("");
      setResult("");
      try {
        setResult(formatThiagoDraft(input, route));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to format this draft.");
      }
    }}>
      <p className="text-sm text-[#9abc96]">Paste a draft or start with a headline on the first line. For Current Events, follow it with three short claims and one URL directly under each. For Conspiracy, paste the body below the headline.</p>
      {routes.length ? (
        <label className="grid gap-1 text-sm">
          Route for raw notes
          <select className={fieldClass} value={route} onChange={(event) => {
            setRoute(event.target.value as ThiagoArticleRoute);
            setResult("");
          }}>
            {routes.map((category) => <option key={category} value={category}>{category === "theory" ? "Conspiracy" : "Current Events"}</option>)}
          </select>
        </label>
      ) : null}
      <textarea aria-label="Draft to format" rows={9} className={fieldClass} value={input} onChange={(event) => {
        onInput(event.target.value);
        setResult("");
        setError("");
      }} />
      <button className={actionClass} type="submit" disabled={!input.trim()}>📝 FORMAT</button>
      {error ? <p role="alert" className="text-sm text-[#ff9b9b]">{error}</p> : null}
      {result ? (
        <>
          <textarea aria-label="Formatted draft" readOnly rows={9} className={fieldClass} value={result} />
          <button className={actionClass} type="button" onClick={() => onUse(result)}>🌀 Use in Paste &amp; Go 🎢</button>
        </>
      ) : null}
    </form>
  );
}
