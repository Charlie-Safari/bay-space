"use client";

import { useCallback, useEffect, useState } from "react";
import { validateQuizQuestion, type QuizQuestion } from "../../../lib/bay-space-quiz-format";
import styles from "../quiz.module.css";

type Source = { id: string; title: string };
type Draft = { weekStart: string; questions: QuizQuestion[]; sources: Source[] };
const fresh = (): QuizQuestion => ({ question: "", options: ["", ""], correctIndex: 0, explanation: "", postId: "" });
const letters = ["A", "B", "C", "D"];

export default function QuizAuthorForm() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [working, setWorking] = useState<QuizQuestion>(fresh);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/quiz/draft", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message);
    setDraft(body);
  }, []);

  useEffect(() => { refresh().catch(cause => setError(cause instanceof Error ? cause.message : "Unable to load editor.")); }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh().catch(() => {});
    }, 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (active === null || revision === 0 || !draft) return;
    let question: QuizQuestion;
    try { question = validateQuizQuestion(working); }
    catch { setStatus("Complete the question, answer options, correct answer and source to save it."); return; }
    const position = active + 1;
    const action = position > draft.questions.length ? "append" : "save";
    const timer = window.setTimeout(async () => {
      setStatus("Saving…");
      try {
        const response = await fetch("/api/quiz/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, position, question, weekStart: draft.weekStart }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message);
        setDraft(current => current ? { ...current, weekStart: body.weekStart, questions: body.questions } : current);
        if (action === "append" && body.position !== position) setActive(body.position - 1);
        setRevision(current => current === revision ? 0 : current);
        setStatus("Saved to the shared quiz draft."); setError("");
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save question."); setStatus(""); }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [active, draft?.weekStart, revision, working]);

  function selectSlot(position: number) {
    setActive(position); setWorking(draft?.questions[position] ?? fresh()); setRevision(0); setStatus(""); setError("");
  }
  function change(update: Partial<QuizQuestion>) { setWorking(current => ({ ...current, ...update })); setRevision(value => value + 1); }

  async function erase(position: number) {
    if (!draft || position >= draft.questions.length) return;
    try {
      const response = await fetch("/api/quiz/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "delete", position: position + 1, weekStart: draft.weekStart }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setDraft(current => current ? { ...current, questions: body.questions } : current);
      setActive(null); setRevision(0); setStatus("Question removed; later questions moved up."); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to remove question."); }
  }

  return <div className={styles.quiz}>
    <header><p className={styles.eyebrow}>Shared Impossible badge editor</p><h2>QUIZ AUTHOR FORM</h2>
      <p>All Impossible badge holders can edit these 36 slots. Complete questions save automatically. The quiz posts Sunday at 11:59 PM Pacific; the next blank draft opens immediately afterward.</p>
      {draft ? <p>Upcoming quiz week: {draft.weekStart} · {draft.questions.length} of 36 questions saved</p> : null}
    </header>
    {error ? <div role="alert" className={styles.notice}>{error} {!draft ? <button onClick={() => void refresh().catch(() => {})}>Try again</button> : null}</div> : null}
    {!draft && !error ? <p role="status">Loading shared quiz draft…</p> : null}
    {status ? <p role="status">{status}</p> : null}
    {draft ? <div className={styles.slots}>{Array.from({ length: 36 }, (_, position) => {
      const saved = draft.questions[position];
      const selected = active === position;
      return <section key={`${draft.weekStart}-${position}`} className={styles.card}>
        <div className={styles.slotHead}><button type="button" onClick={() => selectSlot(position)} aria-expanded={selected} className={styles.slotButton} disabled={position > draft.questions.length}>
          <span>Question {position + 1}</span><span>{saved?.question || "Blank question + answer template"}</span>
        </button>{saved ? <button type="button" className={styles.deleteButton} aria-label={`Erase question ${position + 1}`} title="Erase and renumber" onClick={() => void erase(position)}>×</button> : null}</div>
        {selected ? <div className={styles.editor}>
          <label>Question<textarea maxLength={500} rows={3} value={working.question} onChange={event => change({ question: event.target.value })} placeholder="Write the question" /></label>
          <label>Current Events source<select value={working.postId} onChange={event => change({ postId: event.target.value })}><option value="">Choose an article</option>{draft.sources.map(source => <option key={source.id} value={source.id}>{source.title}</option>)}</select></label>
          <div className={styles.answerGroup}><p className={styles.eyebrow}>Answer options · tap the circle beside the correct answer</p>
            {working.options.map((option, answerIndex) => <div className={styles.optionEditor} key={answerIndex}>
              <label className={styles.correctCircle}><input type="radio" name={`correct-${position}`} checked={working.correctIndex === answerIndex} onChange={() => change({ correctIndex: answerIndex })} /><span className="sr-only">Correct answer {letters[answerIndex]}</span></label>
              <label>{letters[answerIndex]}<input maxLength={200} value={option} placeholder={`Answer ${letters[answerIndex]}`} onChange={event => change({ options: working.options.map((value, at) => at === answerIndex ? event.target.value : value) })} /></label>
              {working.options.length > 2 ? <button type="button" aria-label={`Remove answer ${letters[answerIndex]}`} onClick={() => change({ options: working.options.filter((_, at) => at !== answerIndex), correctIndex: working.correctIndex === answerIndex ? 0 : Math.max(0, working.correctIndex - Number(working.correctIndex > answerIndex)) })}>×</button> : null}
            </div>)}
            {working.options.length < 4 ? <button type="button" onClick={() => change({ options: [...working.options, ""] })}>+ Add answer option</button> : null}
          </div>
          <details><summary>Optional quiz design settings</summary><label>Explanation shown after completion<textarea maxLength={1500} rows={3} value={working.explanation} onChange={event => change({ explanation: event.target.value })} /></label></details>
        </div> : null}
      </section>;
    })}</div> : null}
  </div>;
}
