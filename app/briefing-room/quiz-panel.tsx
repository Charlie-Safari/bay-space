"use client";

import { useEffect, useState } from "react";
import type { QuizQuestion } from "../../lib/bay-space-quiz-format";
import type { QuizAttempt } from "../../lib/bay-space-quizzes";
import styles from "./quiz.module.css";

type ViewQuestion = (Omit<QuizQuestion, "correctIndex" | "explanation"> & Partial<Pick<QuizQuestion, "correctIndex" | "explanation">>) | null;
type QuizData = { canAuthor: boolean; attempt: QuizAttempt | null; quiz: { id: string; title: string; questions: ViewQuestion[] } | null };
type Result = { correct: number; total: number; points: number; promotionBonus: number; claimed: boolean; questions: (QuizQuestion | null)[] };

export default function QuizPanel() {
  const [data, setData] = useState<QuizData | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<number[]>(Array(36).fill(-1));
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [practice, setPractice] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/quiz", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setData(body); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load quiz."); }
  }
  useEffect(() => { void load(); }, []);

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
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to submit quiz."); }
    finally { setBusy(false); }
  }

  const quiz = data?.quiz;
  const recorded = data?.attempt;
  const finished = Boolean(result || (recorded && !practice));
  const question = quiz?.questions[index];
  const missing = quiz?.questions.findIndex((item, at) => item !== null && answers[at] < 0) ?? -1;
  const answered = quiz?.questions.filter((item, at) => item === null || answers[at] >= 0).length ?? 0;
  const review = result?.questions ?? quiz?.questions ?? [];
  const chosen = result ? answers : recorded?.answers ?? answers;

  return <div className={styles.quiz}>
    <header><p className={styles.eyebrow}>Current Events · Weekly Quiz</p><h2>QUIZ</h2></header>
    {error ? <div className={styles.notice} role="alert">{error} {!data ? <button onClick={load}>Try again</button> : null}</div> : null}
    {!data && !error ? <p role="status">Loading quiz…</p> : null}
    {data ? <div className={styles.actions}>
      <button type="button" onClick={() => setOpen(true)}>Take Quiz</button>
      {data.canAuthor ? <a className={styles.buttonLink} href="/briefing-room/quiz-author" target="_blank" rel="noopener noreferrer">Quiz Author Form</a> : null}
    </div> : null}
    {open && data && !quiz ? <section className={styles.card}><h3>This week’s quiz is on its way</h3><p>Explore <a href="/facts-on-news">Current Events</a> while the next quiz is prepared.</p></section> : null}
    {open && quiz && !finished ? <section className={styles.card}>
      <h3>{quiz.title}</h3><p>{practice ? "Practice only; no additional points." : "36 slots · 50 points per correct answer · Blank slots count as correct bonuses."}</p>
      <p className={styles.eyebrow}>Question {index + 1} / 36 · {answered} complete</p><progress aria-label="Questions complete" value={answered} max={36} />
      {question === null ? <div className={styles.bonus}><h4>Bonus question</h4><p>This slot was left blank. You receive 50 points automatically when you finish.</p></div> : question ? <fieldset disabled={busy}>
        <legend>{question.question}</legend>{question.options.map((option, optionIndex) => <label className={styles.answer} key={optionIndex}>
          <input type="radio" name={`quiz-answer-${index}`} checked={answers[index] === optionIndex} onChange={() => setAnswers(current => current.map((value, at) => at === index ? optionIndex : value))} /><span>{option}</span>
        </label>)}
      </fieldset> : null}
      <div className={styles.actions}><button disabled={index === 0 || busy} onClick={() => setIndex(index - 1)}>Back</button>
        {index < 35 ? <button disabled={busy} onClick={() => setIndex(index + 1)}>Next</button> : <button disabled={busy || missing >= 0} onClick={submit}>{busy ? "Submitting…" : "Submit quiz"}</button>}
      </div>{index === 35 && missing >= 0 ? <button onClick={() => setIndex(missing)}>Go to unanswered question</button> : null}
    </section> : null}
    {open && finished ? <section className={styles.card}>
      <h3>{result ? result.correct : recorded?.correct_count} / 36 correct</h3>
      <p role="status">{result ? (result.claimed ? `${result.points.toLocaleString()} points earned${result.promotionBonus ? ` + ${result.promotionBonus.toLocaleString()} promotion bonus` : ""}.` : "Practice complete. Your recorded score stays the same.") : `${recorded?.points_awarded.toLocaleString()} quiz points earned.`}</p>
      <button onClick={() => { setResult(null); setPractice(true); setAnswers(Array(36).fill(-1)); setIndex(0); }}>Practice again</button>
      <details><summary>Review answers</summary>{review.map((item, at) => <div className={styles.review} key={at}>
        {item === null ? <p>{at + 1}. Bonus slot · counted correct</p> : <><h4>{at + 1}. {item.question}</h4><p>Your answer: {item.options[chosen[at]] ?? "Unanswered"}</p><p>Correct answer: {item.options[item.correctIndex ?? 0]}</p><p>{item.explanation}</p><a href={`/facts-on-news#post-${encodeURIComponent(item.postId)}`}>Read the article ↗</a></>}
      </div>)}</details>
    </section> : null}
  </div>;
}
