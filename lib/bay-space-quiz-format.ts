export const quizTimeZone = "America/Los_Angeles";

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  postId: string;
};

export type QuizDraft = {
  title: string;
  weekStart: string;
  questions: QuizQuestion[];
};

export function shiftQuizDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function quizDateStart(date: string) {
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: quizTimeZone, timeZoneName: "longOffset" })
    .formatToParts(new Date(`${date}T12:00:00Z`)).find(part => part.type === "timeZoneName")!.value.replace("GMT", "");
  return new Date(`${date}T00:00:00${offset}`).toISOString();
}

export function getQuizWeek(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: quizTimeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const today = `${values.year}-${values.month}-${values.day}`;
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const weekStart = shiftQuizDate(today, -((weekday + 6) % 7));
  return { weekStart, sourceStart: shiftQuizDate(weekStart, -7), sourceEnd: shiftQuizDate(weekStart, -1), weekEnd: shiftQuizDate(weekStart, 6) };
}

export function validateQuizDraft(value: unknown): QuizDraft {
  if (!value || typeof value !== "object") throw new Error("Enter a quiz.");
  const draft = value as Partial<QuizDraft>;
  if (typeof draft.title !== "string" || !draft.title.trim() || draft.title.trim().length > 150) throw new Error("Use a title of 1–150 characters.");
  if (typeof draft.weekStart !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(draft.weekStart)) throw new Error("Choose a Monday for the quiz week.");
  const date = new Date(`${draft.weekStart}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== draft.weekStart || date.getUTCDay() !== 1) throw new Error("Choose a Monday for the quiz week.");
  if (!Array.isArray(draft.questions) || draft.questions.length !== 36) throw new Error("Include exactly 36 questions.");
  const questions = draft.questions.map((item, index) => {
    const prefix = `Question ${index + 1}: `;
    if (!item || typeof item !== "object" || typeof item.question !== "string" || !item.question.trim() || item.question.length > 500) throw new Error(prefix + "use 1–500 characters.");
    if (!Array.isArray(item.options) || item.options.length < 2 || item.options.length > 4 || item.options.some(option => typeof option !== "string" || !option.trim() || option.length > 200)) throw new Error(prefix + "use 2–4 answers, up to 200 characters each.");
    const options = item.options.map(option => option.trim());
    if (new Set(options.map(option => option.toLowerCase())).size !== options.length) throw new Error(prefix + "answers must be different.");
    if (!Number.isInteger(item.correctIndex) || item.correctIndex < 0 || item.correctIndex >= options.length) throw new Error(prefix + "select the correct answer.");
    if (typeof item.postId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.postId)) throw new Error(prefix + "choose a Current Events article.");
    if (typeof item.explanation !== "string" || item.explanation.length > 1500) throw new Error(prefix + "use an explanation up to 1,500 characters.");
    return { question: item.question.trim(), options, correctIndex: item.correctIndex, explanation: item.explanation.trim(), postId: item.postId };
  });
  return { title: draft.title.trim(), weekStart: draft.weekStart, questions };
}
