import { parseThiagoV3 } from "./thiago-v3-intake";

export type ThiagoArticleRoute = "daily-food" | "theory";

export function formatThiagoDraft(input: string, route: ThiagoArticleRoute) {
  const text = input.replace(/\r\n?/g, "\n").trim()
    .replace(/^\x60\x60\x60(?:text|json|markdown)?[^\S\n]*\n/i, "")
    .replace(/\n\x60\x60\x60\s*$/, "").trim();
  if (!text) throw new Error("Paste draft text first.");

  if (text.startsWith("{") || /^[ \t]*Route:/im.test(text)) {
    const formatted = text.startsWith("{") ? text : text
      .replace(/^[ \t]*Title:[ \t]*/im, "Headline: ")
      .replace(/^[ \t]*Body:[ \t]+(\S.*)$/im, "Body:\n$1")
      .replace(/^[ \t]*Source:[ \t]*(https?:\/\/\S+)[ \t]*$/gim, "Source link: $1");
    const draft = parseThiagoV3(formatted);
    if (!draft) throw new Error("Add a route and headline before formatting.");
    return formatted;
  }

  const [firstLine, ...remaining] = text.split("\n");
  const headline = firstLine.replace(/^(?:#+\s*|(?:headline|title):\s*)/i, "").trim();
  let formatted: string;

  if (route === "theory") {
    const body = remaining.join("\n").trim().replace(/^Body:[ \t]*\n/i, "");
    formatted = `Route: Conspiracy\nHeadline: ${headline}\nBody:\n${body}`;
  } else {
    const lines = remaining.map((line) => line.trim()).filter(Boolean);
    if (lines.length !== 6) {
      throw new Error("After the headline, enter three short claims, each followed by its source URL on the next line.");
    }
    const tags = [0, 2, 4].map((index) => {
      const claim = lines[index].replace(/^(?:Tag \d+:|[-*])\s*/i, "");
      const source = lines[index + 1].replace(/^Source(?: link)?:\s*/i, "");
      return `Tag ${index / 2 + 1}: ${claim}\nSource link: ${source}`;
    });
    formatted = [`Route: Current Events\nHeadline: ${headline}`, ...tags].join("\n");
  }

  parseThiagoV3(formatted);
  return formatted;
}
