"use client";

import { useEffect, useState } from "react";
import { validateQuizDraft, type QuizQuestion } from "../../lib/bay-space-quiz-format";
import type { QuizAttempt } from "../../lib/bay-space-quizzes";
import styles from "./quiz.module.css";

type ViewQuestion = Omit<QuizQuestion, "correctIndex" | "explanation"> & Partial<Pick<QuizQuestion, "correctIndex" | "explanation">>;
type QuizData = {
  week: { weekStart: string; sourceStart: string; sourceEnd: string; weekEnd: string };
  canAuthor: boolean;
  attempt: QuizAttempt | null;
  sources: { id: string; title: string }[];
  quiz: { id: string; title: string; questions: ViewQuestion[] } | null;
};
type Result = { correct: number; total: number; points: number; promotionBonus: number; claimed: boolean; questions: QuizQuestion[] };
const blankQuestion = (): QuizQuestion => ({ question: "", options: ["", "", "", ""], correctIndex: 0, explanation: "", postId: "" });

export default function QuizPanel() {
  const [data, setData] = useState<QuizData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<number[]>(Array(36).fill(-1));
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [practice, setPractice] = useState(false);
  const [title, setTitle] = useState("Weekly Current Events Quiz");
  const [draft, setDraft] = useState<QuizQuestion[]>(Array.from({ length: 36 }, blankQuestion));
  const [json, setJson] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/quiz");
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setData(body);
      setError("");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to load quiz."); }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/quiz", { signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message);
        return body as QuizData;
      })
      .then(setData)
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load quiz."); });
    return () => controller.abort();
  }, []);

  function changeQuestion(at: number, update: Partial<QuizQuestion>) {
    setDraft(current => current.map((question, i) => i === at ? { ...question, ...update } : question));
  }

  async function publish() {
    if (!data || busy) return;
    setBusy(true); setError("");
    try {
      const payload = validateQuizDraft({ title, weekStart: data.week.weekStart, questions: draft });
      const response = await fetch("/api/quiz", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to publish quiz."); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!data?.quiz || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/quiz/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quizId: data.quiz.id, answers }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setResult(body);
      window.dispatchEvent(new Event("bay-space-auth"));
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to submit quiz."); }
    finally { setBusy(false); }
  }

  const finished = Boolean(result || (data?.attempt && !practice));
  const review = result?.questions ?? data?.quiz?.questions ?? [];
  const recorded = data?.attempt;
  const chosen = result ? answers : recorded?.answers ?? answers;

  return (
    <div className={styles.quiz}>
      <header>
        <p className={styles.eyebrow}>Current Events · Weekly Quiz</p>
        <h2>QUIZ</h2>
        {data ? <p>Articles from {data.week.sourceStart} through {data.week.sourceEnd}. Quiz closes Sunday, {data.week.weekEnd} (Pacific time).</p> : null}
        <p>36 questions · 50 points each · Up to 1,800 points</p>
      </header>
      {error ? <div role="alert" className={styles.notice}>{error}{!data ? <button onClick={load}>Try again</button> : null}</div> : null}
      {!data && !error ? <p role="status">Loading this week’s quiz…</p> : null}
      {data && !data.quiz ? (
        <section className={styles.card}>
          <h3>This week’s quiz is on its way</h3>
          <p>Come back soon. In the meantime, catch up on <a href="/facts-on-news">Current Events</a>.</p>
        </section>
      ) : null}
      {data?.quiz && !finished ? (
        <section className={styles.card}>
          <h3>{data.quiz.title}</h3>
          <p>{practice ? "Practice: no extra points or changes to your recorded score." : "Your first submission earns points and counts toward your Score Card. Practice retries are free."}</p>
          <p className={styles.eyebrow}>Question {index + 1} / 36 · {answers.filter(answer => answer >= 0).length} answered</p>
          <progress aria-label="Questions answered" value={answers.filter(answer => answer >= 0).length} max={36} />
          <fieldset disabled={busy}>
            <legend>{data.quiz.questions[index].question}</legend>
            {data.quiz.questions[index].options.map((option, optionIndex) => (
              <label className={styles.answer} key={optionIndex}>
                <input type="radio" name={`quiz-answer-${index}`} checked={answers[index] === optionIndex} onChange={() => setAnswers(current => current.map((value, i) => i === index ? optionIndex : value))} />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
          <div className={styles.actions}>
            <button disabled={index === 0 || busy} onClick={() => setIndex(index - 1)}>Back</button>
            {index < 35 ? <button disabled={busy} onClick={() => setIndex(index + 1)}>Next</button> : <button disabled={busy || answers.some(answer => answer < 0)} onClick={submit}>{busy ? "Submitting…" : "Submit quiz"}</button>}
          </div>
          {index === 35 && answers.some(answer => answer < 0) ? <button onClick={() => setIndex(answers.findIndex(answer => answer < 0))}>Go to unanswered question</button> : null}
        </section>
      ) : null}
      {finished ? (
        <section className={styles.card}>
          <h3>{result ? result.correct : recorded?.correct_count} / 36 correct</h3>
          <p role="status">{result ? (result.claimed ? `${result.points.toLocaleString()} points earned${result.promotionBonus ? ` + ${result.promotionBonus.toLocaleString()} promotion bonus` : ""}.` : "Practice complete. Your original score and points stay unchanged.") : `${recorded?.points_awarded.toLocaleString()} quiz points earned.`}</p>
          <button onClick={() => { setResult(null); setPractice(true); setAnswers(Array(36).fill(-1)); setIndex(0); }}>Practice again</button>
          <details><summary>Review answers</summary>
            {review.map((question, i) => <div className={styles.review} key={i}>
              <h4>{i + 1}. {question.question}</h4>
              <p>Your answer: {question.options[chosen[i]]}</p>
              <p>Correct answer: {question.options[question.correctIndex ?? 0]}</p>
              <p>{question.explanation}</p>
              <a href={`/facts-on-news#post-${encodeURIComponent(question.postId)}`}>Read the article ↗</a>
            </div>)}
          </details>
        </section>
      ) : null}
      {data?.canAuthor && !data.quiz ? (
        <details className={styles.card}>
          <summary>Author this week’s quiz</summary>
          <p>Write 36 questions using last week’s Current Events. Publishing locks the questions and answer key for this week.</p>
          {!data.sources.length ? <p>No Current Events articles were published in the source week.</p> : null}
          <details><summary>Import quiz draft</summary>
            <p>Paste a quiz JSON draft, then review all questions before publishing.</p>
            <textarea aria-label="Quiz JSON draft" value={json} onChange={event => setJson(event.target.value)} rows={8} />
            <button onClick={() => { try { const imported = validateQuizDraft(JSON.parse(json)); if (imported.weekStart !== data.week.weekStart) throw new Error("The draft must be for this quiz week."); setTitle(imported.title); setDraft(imported.questions); setError(""); } catch (error) { setError(error instanceof Error ? error.message : "Invalid quiz draft."); } }}>Load draft</button>
          </details>
          <label>Quiz title<input value={title} maxLength={150} onChange={event => setTitle(event.target.value)} /></label>
          {draft.map((question, i) => <details className={styles.editor} key={i}>
            <summary>Question {i + 1}{question.question ? ` · ${question.question.slice(0, 55)}` : ""}</summary>
            <label>Source article<select value={question.postId} onChange={event => changeQuestion(i, { postId: event.target.value })}><option value="">Choose an article</option>{data.sources.map(source => <option value={source.id} key={source.id}>{source.title}</option>)}</select></label>
            <label>Question<textarea maxLength={500} value={question.question} onChange={event => changeQuestion(i, { question: event.target.value })} /></label>
            <label>Number of answers<select value={question.options.length} onChange={event => { const count = Number(event.target.value); changeQuestion(i, { options: Array.from({ length: count }, (_, j) => question.options[j] ?? ""), correctIndex: Math.min(question.correctIndex, count - 1) }); }}>{[2,3,4].map(count => <option key={count}>{count}</option>)}</select></label>
            {question.options.map((option, j) => <label key={j}>Answer {j + 1}<input maxLength={200} value={option} onChange={event => changeQuestion(i, { options: question.options.map((value, at) => at === j ? event.target.value : value) })} /></label>)}
            <label>Correct answer<select value={question.correctIndex} onChange={event => changeQuestion(i, { correctIndex: Number(event.target.value) })}>{question.options.map((_, j) => <option key={j} value={j}>Answer {j + 1}</option>)}</select></label>
            <label>Explanation<textarea maxLength={1500} value={question.explanation} onChange={event => changeQuestion(i, { explanation: event.target.value })} /></label>
          </details>)}
          <button onClick={publish} disabled={busy || !data.sources.length}>{busy ? "Publishing…" : "Publish weekly quiz"}</button>
        </details>
      ) : null}
    </div>
  );
}
