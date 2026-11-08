"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { validateQuizQuestion, type QuizQuestion, type SharedQuizQuestion } from "../../../lib/bay-space-quiz-format";
import styles from "../quiz.module.css";

type Source = { id: string; title: string };
type Draft = { weekStart: string; questions: SharedQuizQuestion[]; sources: Source[] };
type Editor = {
  id: string;
  weekStart: string;
  submitted: boolean;
  dirty: boolean;
  question: QuizQuestion;
};
const backHref = "/briefing-room?panel=quiz";
const fresh = (): QuizQuestion => ({ question: "", options: ["", ""], correctIndex: 0, explanation: "", postId: "" });
const letters = ["A", "B", "C", "D"];

export default function QuizAuthorForm({ memberNumber }: { memberNumber: number }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const pending = useRef(false);
  const requestVersion = useRef(0);
  const warning = useRef<HTMLDialogElement>(null);
  const afterDiscard = useRef<(() => void) | null>(null);
  const dirty = editor?.dirty ?? false;
  const hasOpenEditor = Boolean(draft && editor && editor.weekStart === draft.weekStart &&
    (editor.submitted ? draft.questions.some(question => question.id === editor.id) : draft.questions.length < 36));

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (pending.current) return;
    const version = ++requestVersion.current;
    try {
      const response = await fetch("/api/quiz/draft", { cache: "no-store", signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Unable to load editor.");
      if (!signal?.aborted && version === requestVersion.current) setDraft(body);
    } catch (cause) {
      if (!signal?.aborted && version === requestVersion.current) throw cause;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void refresh(controller.signal).catch(cause => setError(cause instanceof Error ? cause.message : "Unable to load editor."));
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [refresh]);

  useEffect(() => {
    if (dirty || busy) return;
    const timer = window.setInterval(() => { void refresh().catch(() => {}); }, 15000);
    return () => window.clearInterval(timer);
  }, [dirty, busy, refresh]);

  useEffect(() => {
    if (!dirty && !busy) return;
    function warnOnUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnOnUnload);
    return () => window.removeEventListener("beforeunload", warnOnUnload);
  }, [dirty, busy]);

  function leaveEditor(action: () => void) {
    if (pending.current) return;
    if (!dirty) { action(); return; }
    afterDiscard.current = action;
    warning.current?.showModal();
  }

  function selectSlot(saved?: SharedQuizQuestion) {
    if (!draft) return;
    if (editor?.weekStart === draft.weekStart && (saved ? editor.id === saved.id : !editor.submitted)) return;
    leaveEditor(() => {
      setEditor({
        id: saved?.id ?? crypto.randomUUID(),
        weekStart: draft.weekStart,
        submitted: Boolean(saved),
        dirty: false,
        question: saved ?? fresh(),
      });
      setError("");
      setStatus("");
    });
  }

  function change(update: Partial<QuizQuestion>) {
    requestVersion.current++;
    setEditor(current => current && { ...current, dirty: true, question: { ...current.question, ...update } });
    setError("");
    setStatus("");
  }

  async function mutate(payload: {
    action: "append" | "save" | "delete";
    questionId: string;
    weekStart: string;
    question?: QuizQuestion;
  }) {
    pending.current = true;
    requestVersion.current++;
    setBusy(true);
    setError("");
    setStatus(payload.action === "delete" ? "Removing question…" : "Submitting…");
    try {
      const response = await fetch("/api/quiz/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Unable to update the shared draft.");
      setDraft(current => current && { ...current, weekStart: body.weekStart, questions: body.questions });
      if (payload.action === "delete") {
        setEditor(current => current?.id === payload.questionId ? null : current);
        setStatus("Question removed. Later questions moved up.");
      } else {
        const question = (body.questions as SharedQuizQuestion[]).find(item => item.id === payload.questionId);
        if (!question) throw new Error("The submitted question could not be confirmed.");
        setEditor(current => current && { ...current, question, submitted: true, dirty: false });
        setStatus("Submitted to the shared quiz draft.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update the shared draft.");
      setStatus("");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || pending.current || (editor.submitted && !editor.dirty)) return;
    let question: QuizQuestion;
    try {
      question = validateQuizQuestion(editor.question);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message.replace(/^Question 1: /, "") : "Complete the question before submitting.");
      return;
    }
    void mutate({
      action: editor.submitted ? "save" : "append",
      questionId: editor.id,
      weekStart: editor.weekStart,
      question,
    });
  }

  function submitOnEnter(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    const field = event.target;
    if (!(field instanceof HTMLTextAreaElement) && !(field instanceof HTMLInputElement && field.type === "text")) return;
    event.preventDefault();
    event.currentTarget.requestSubmit();
  }

  return <div className={styles.quiz}>
    <Link href={backHref} className={`${styles.buttonLink} w-fit`} onNavigate={event => {
      if (!dirty && !pending.current) return;
      event.preventDefault();
      leaveEditor(() => router.push(backHref));
    }}>← Back to Quiz</Link>

    <header><p className={styles.eyebrow}>Shared Impossible badge editor</p><h2>QUIZ AUTHOR FORM</h2>
      <p>Submit a question to add it to the shared draft. You can read other authors’ questions and edit or delete your own. The quiz posts Sunday at 11:59 PM Pacific.</p>
      {draft ? <p>Upcoming quiz week: {draft.weekStart} · {draft.questions.length} of 36 questions submitted</p> : null}
    </header>
    {error && !hasOpenEditor ? <div role="alert" className={styles.notice}>{error} {!draft ? <button type="button" onClick={() => {
      setError("");
      void refresh().catch(cause => setError(cause instanceof Error ? cause.message : "Unable to load editor."));
    }}>Try again</button> : null}</div> : null}
    {!draft && !error ? <p role="status">Loading shared quiz draft…</p> : null}
    {status ? <p role="status">{status}</p> : null}

    {draft ? <div className={styles.slots}>{Array.from({ length: 36 }, (_, position) => {
      const saved = draft.questions[position];
      const nextSlot = position === draft.questions.length;
      const selected = editor?.weekStart === draft.weekStart && (saved ? editor.id === saved.id : nextSlot && !editor.submitted);
      const canEdit = !saved || saved.authorMember === memberNumber;
      const working = selected ? editor.question : null;
      return <section key={saved?.id ?? (selected ? editor.id : `${draft.weekStart}-slot-${position}`)} className={styles.card}>
        <div className={styles.slotHead}>
          <button type="button" onClick={() => selectSlot(saved)} aria-expanded={selected} className={styles.slotButton} disabled={busy || (!saved && !nextSlot)}>
            <span>Question {position + 1}</span><span>{saved?.question || "Blank question + answer template"}</span>
          </button>
          {saved && canEdit ? <button type="button" className={styles.deleteButton} aria-label={`Erase question ${position + 1}`} title="Erase and renumber" disabled={busy} onClick={() => leaveEditor(() => {
            if (dirty) setEditor(null);
            void mutate({ action: "delete", questionId: saved.id, weekStart: draft.weekStart });
          })}>×</button> : null}
        </div>
        {saved ? <p className={styles.eyebrow}>{saved.authorMember === undefined ? "Submitted · original author unavailable" : `Submitted by #${String(saved.authorMember).padStart(5, "0")}`}</p> : null}
        {working && editor ? <form className={styles.editor} onSubmit={submit} onKeyDown={submitOnEnter}>
          <fieldset disabled={busy || !canEdit}>
            <label>Question<textarea maxLength={500} rows={3} value={working.question} onChange={event => change({ question: event.target.value })} placeholder="Write the question" /></label>
            <label>Current Events source<select value={working.postId} onChange={event => change({ postId: event.target.value })}><option value="">Choose an article</option>{draft.sources.map(source => <option key={source.id} value={source.id}>{source.title}</option>)}{working.postId && !draft.sources.some(source => source.id === working.postId) ? <option value={working.postId}>Source no longer available</option> : null}</select></label>
            <div className={styles.answerGroup}><p className={styles.eyebrow}>{canEdit ? "Answer options · tap the circle beside the correct answer" : "Answer options · the selected circle marks the correct answer"}</p>
              {working.options.map((option, answerIndex) => <div className={styles.optionEditor} key={answerIndex}>
                <label className={styles.correctCircle}><input type="radio" name={`correct-${position}`} checked={working.correctIndex === answerIndex} onChange={() => change({ correctIndex: answerIndex })} /><span className="sr-only">Correct answer {letters[answerIndex]}</span></label>
                <label>{letters[answerIndex]}<input maxLength={200} value={option} placeholder={`Answer ${letters[answerIndex]}`} onChange={event => change({ options: working.options.map((value, at) => at === answerIndex ? event.target.value : value) })} /></label>
                {canEdit && working.options.length > 2 ? <button type="button" aria-label={`Remove answer ${letters[answerIndex]}`} onClick={() => change({ options: working.options.filter((_, at) => at !== answerIndex), correctIndex: working.correctIndex === answerIndex ? 0 : Math.max(0, working.correctIndex - Number(working.correctIndex > answerIndex)) })}>×</button> : null}
              </div>)}
              {canEdit && working.options.length < 4 ? <button type="button" onClick={() => change({ options: [...working.options, ""] })}>+ Add answer option</button> : null}
            </div>
            <details><summary>Optional quiz design settings</summary><label>Explanation shown after completion<textarea maxLength={1500} rows={3} value={working.explanation} onChange={event => change({ explanation: event.target.value })} /></label></details>
          </fieldset>
          {error ? <div role="alert" className={styles.notice}>{error}</div> : null}
          {canEdit ? <button type="submit" disabled={busy || (editor.submitted && !editor.dirty)}>
            {busy ? "Submitting…" : editor.submitted && !editor.dirty ? "Submitted" : "Submit"}
          </button> : <p>Read only.</p>}
        </form> : null}
      </section>;
    })}</div> : null}

    <dialog ref={warning} className={styles.unsavedDialog} aria-labelledby="quiz-unsaved-title" onClose={() => { afterDiscard.current = null; }}>
      <h3 id="quiz-unsaved-title">Don’t forget to submit your new changes.</h3>
      <div className={styles.actions}>
        <button type="button" autoFocus onClick={() => warning.current?.close()}>Keep editing</button>
        <button type="button" onClick={() => {
          const action = afterDiscard.current;
          warning.current?.close();
          action?.();
        }}>Discard changes</button>
      </div>
    </dialog>
  </div>;
}
