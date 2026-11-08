"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { knowSomethingArchiveHref } from "../../lib/theory-categories";

type Receipt = { id: string; deleteUntil: string };

const fieldClass = "w-full rounded-lg border border-[#426840] bg-[#030604] px-3 py-2 text-[#d8ecd2] outline-none focus:border-[#a2d59b]";
const buttonClass = "w-fit rounded-lg border border-[#72c16a] px-4 py-2 font-bold text-[#d8ecd2] hover:bg-[#254124] disabled:opacity-50";

export default function KnowSomethingForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [expired, setExpired] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!receipt) return;
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, Date.parse(receipt.deleteUntil) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [receipt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !title.trim() || !body.trim()) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/know-something", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message ?? "Unable to publish the note.");
        return;
      }
      setExpired(false);
      setReceipt(data);
      setTitle("");
      setBody("");
    } catch {
      setMessage("Unable to publish the note. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!receipt || expired || pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/know-something?id=${encodeURIComponent(receipt.id)}`, { method: "DELETE" });
      if (response.ok) {
        setReceipt(null);
        setMessage("Note deleted.");
      } else {
        const data = await response.json();
        if (response.status === 403 || response.status === 410) setExpired(true);
        setMessage(data.message ?? "Unable to delete the note.");
      }
    } catch {
      setMessage("Unable to delete the note. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {receipt ? (
        <div className="mt-6 grid gap-4 rounded-lg border border-[#426840] p-4">
          <p role="status">Posted anonymously.</p>
          <p className="text-sm text-[#b6ccb2]">{expired ? "The delete window has closed." : "You have two minutes from posting to delete this note."}</p>
          <div className="flex flex-wrap items-center gap-4">
            {!expired ? <button type="button" onClick={remove} disabled={pending} className={buttonClass}>{pending ? "Deleting…" : "Delete note"}</button> : null}
            <Link href={`${knowSomethingArchiveHref}#post-${receipt.id}`} target="_blank" rel="noopener" className="text-[#a2d59b] underline underline-offset-4">View note in the iceberg →</Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm">Title
            <input className={fieldClass} value={title} maxLength={140} required onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm">What do you know?
            <textarea className={`${fieldClass} resize-y`} rows={9} value={body} maxLength={50_000} required onChange={(event) => setBody(event.target.value)} />
          </label>
          <button type="submit" className={buttonClass} disabled={pending || !title.trim() || !body.trim()}>
            {pending ? "Posting…" : "Post anonymously"}
          </button>
        </form>
      )}
      {message ? <p className="mt-4 text-sm text-[#e2ce91]" role="status">{message}</p> : null}
    </>
  );
}
