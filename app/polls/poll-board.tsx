"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type {
  BayPoll,
  BayPollWagerCurrency,
} from "../../lib/bay-space-polls";

type PollResponse = {
  activeCount: number;
  availableSlots: number;
  canAuthor: boolean;
  isSignedIn: boolean;
  polls: BayPoll[];
  viewer: {
    bayoCoins: number;
    bayoTokens: number;
    member: string;
  } | null;
};

type PollFilter = "open" | "closing" | "results" | "mine" | "all";

const emptyResponse: PollResponse = {
  activeCount: 0,
  availableSlots: 16,
  canAuthor: false,
  isSignedIn: false,
  polls: [],
  viewer: null,
};

function timeRemaining(iso: string, now: number) {
  const milliseconds = Math.max(0, new Date(iso).getTime() - now);
  const days = Math.floor(milliseconds / 86_400_000);
  const hours = Math.floor((milliseconds % 86_400_000) / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1000);

  return days > 0
    ? `${days}d ${hours}h ${minutes}m`
    : `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function PollComposer({
  availableSlots,
  onCreated,
}: {
  availableSlots: number;
  onCreated: () => Promise<void>;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/polls", {
        body: JSON.stringify({ question, options }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "poll not posted");
        return;
      }

      setQuestion("");
      setOptions(["", ""]);
      setMessage("poll staged — voting opens in two minutes");
      await onCreated();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-8 rounded-[2rem] border border-[#72c16a]/45 bg-[linear-gradient(145deg,rgba(23,52,27,0.86),rgba(2,7,3,0.94))] p-5 shadow-[0_18px_65px_rgba(0,0,0,0.4)] sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.28em] text-[#a9cda5]">Impossible author console</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.14em] text-[#dce9d9]">Open a Poll</h2>
        </div>
        <span className="rounded-full border border-[#72c16a]/40 bg-black/35 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#9acb94]">
          {availableSlots} / 16 slots open
        </span>
      </div>
      <label className="mt-6 grid gap-2">
        <span className="text-xs font-black uppercase tracking-[0.18em] text-[#a9cda5]">Question · {question.length}/150</span>
        <textarea
          required
          rows={3}
          maxLength={150}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="w-full resize-none rounded-2xl border border-[#72c16a]/35 bg-black/55 px-4 py-3 text-base font-bold text-[#e3eee1] outline-none focus:border-[#90d587] focus:ring-2 focus:ring-[#72c16a]/25"
        />
      </label>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {options.map((option, index) => (
          <label key={index} className="grid gap-2">
            <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#8bae87]">Answer {index + 1}</span>
            <input
              required
              maxLength={80}
              value={option}
              onChange={(event) =>
                setOptions((current) =>
                  current.map((value, optionIndex) =>
                    optionIndex === index ? event.target.value : value,
                  ),
                )
              }
              className="rounded-xl border border-[#72c16a]/30 bg-black/55 px-4 py-3 font-bold text-[#e3eee1] outline-none focus:border-[#90d587]"
            />
          </label>
        ))}
        {options.length === 2 ? (
          <button
            type="button"
            onClick={() => setOptions((current) => [...current, ""])}
            className="min-h-12 self-end rounded-xl border border-dashed border-[#72c16a]/35 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#9acb94] hover:border-[#90d587] hover:bg-[#72c16a]/10"
          >
            + middle ground
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOptions((current) => current.slice(0, 2))}
            className="min-h-12 self-end rounded-xl border border-[#72c16a]/25 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#8bae87] hover:border-[#90d587]"
          >
            remove third answer
          </button>
        )}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          disabled={pending || availableSlots === 0}
          className="rounded-full border border-[#90d587]/65 bg-[#72c16a]/16 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-[#dce9d9] transition hover:-translate-y-0.5 hover:bg-[#72c16a]/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "staging" : "post poll"}
        </button>
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.13em] text-[#8bae87]">2-minute edit window · voting locks until it closes</p>
      </div>
      {message ? <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-[#b8d9b4]">{message}</p> : null}
    </form>
  );
}

function PollCard({ poll, data, now, refresh }: { poll: BayPoll; data: PollResponse; now: number; refresh: () => Promise<void> }) {
  const [selectedOption, setSelectedOption] = useState("");
  const [wagerCurrency, setWagerCurrency] = useState<BayPollWagerCurrency>("none");
  const [wagerAmount, setWagerAmount] = useState(0);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editQuestion, setEditQuestion] = useState(poll.question);
  const [editOptions, setEditOptions] = useState(poll.options.map((option) => option.label));
  const isOpen = poll.status === "open";
  const hasVoted = Boolean(poll.viewerOptionId);
  const isResult = poll.status === "settled";
  const opensIn = timeRemaining(poll.opensAt, now);
  const closesIn = timeRemaining(poll.closesAt, now);

  async function sendVote() {
    if (!selectedOption) {
      setMessage("choose an answer");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/polls/${poll.id}/vote`, {
        body: JSON.stringify({ optionId: selectedOption, wagerAmount, wagerCurrency }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(result.message ?? "vote not submitted");
        return;
      }
      setMessage("vote locked");
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function updatePoll(action: "edit" | "cancel") {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/polls/${poll.id}`, {
        body: JSON.stringify({ action, options: editOptions, question: editQuestion }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(result.message ?? "poll not updated");
        return;
      }
      setEditing(false);
      await refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="flex min-h-[29rem] flex-col rounded-[1.7rem] border border-[#72c16a]/35 bg-[radial-gradient(circle_at_top,rgba(77,128,72,0.16),transparent_44%),rgba(2,8,3,0.88)] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.36)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <span className={`rounded-full border px-3 py-1 text-[0.6rem] font-black uppercase tracking-[0.18em] ${isOpen ? "border-[#90d587]/55 text-[#cce2c9]" : isResult ? "border-[#a9cda5]/30 text-[#a9cda5]" : poll.status === "cancelled" ? "border-[#b67272]/35 text-[#c98c8c]" : "border-[#d1b86b]/35 text-[#d5c68f]"}`}>
          {poll.status === "staging"
            ? `opens ${opensIn}`
            : poll.status === "settled" && !poll.winningOptionId
              ? "tie · refunded"
              : poll.status}
        </span>
        <span className="text-right text-[0.58rem] font-bold uppercase leading-4 tracking-[0.12em] text-[#789274]">#{poll.authorMember}<br />{poll.authorName}</span>
      </div>

      {editing ? (
        <div className="mt-5 grid gap-3">
          <textarea maxLength={150} value={editQuestion} onChange={(event) => setEditQuestion(event.target.value)} className="resize-none rounded-xl border border-[#72c16a]/35 bg-black/60 p-3 font-bold text-[#e3eee1] outline-none" />
          {editOptions.map((option, index) => (
            <input key={index} maxLength={80} value={option} onChange={(event) => setEditOptions((current) => current.map((value, optionIndex) => optionIndex === index ? event.target.value : value))} className="rounded-xl border border-[#72c16a]/35 bg-black/60 p-3 font-bold text-[#e3eee1] outline-none" />
          ))}
          <div className="flex gap-2">
            <button disabled={pending} onClick={() => updatePoll("edit")} className="rounded-full border border-[#90d587]/55 px-4 py-2 text-xs font-black uppercase text-[#dce9d9]">save</button>
            <button onClick={() => setEditing(false)} className="rounded-full border border-[#72c16a]/25 px-4 py-2 text-xs font-black uppercase text-[#9acb94]">back</button>
          </div>
        </div>
      ) : (
        <h2 className="mt-5 text-xl font-black leading-7 text-[#dce9d9]">{poll.question}</h2>
      )}

      {!editing ? <div className="mt-5 grid gap-3">
        {poll.options.map((option) => {
          const isSelected = selectedOption === option.id || poll.viewerOptionId === option.id;
          const isWinner = poll.winningOptionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={!isOpen || hasVoted || !data.isSignedIn}
              onClick={() => setSelectedOption(option.id)}
              className={`relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition ${isWinner ? "border-[#9bd594]/70" : isSelected ? "border-[#90d587]/70" : "border-[#72c16a]/25"} disabled:cursor-default`}
            >
              <span className="absolute inset-y-0 left-0 bg-[#72c16a]/12" style={{ width: `${option.percentage}%` }} />
              <span className="relative flex items-center justify-between gap-3">
                <span className="font-bold text-[#d5e5d2]">{option.label}</span>
                <span className="text-xs font-black text-[#93b28f]">{option.percentage}% · {option.voteCount}</span>
              </span>
            </button>
          );
        })}
      </div> : null}

      {!editing && isOpen && data.isSignedIn && !hasVoted ? (
        <div className="mt-5 rounded-2xl border border-[#72c16a]/20 bg-black/30 p-3">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-[#92ad8e]">1 coin to vote · optional wager</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => { setWagerCurrency("none"); setWagerAmount(0); }} className={`rounded-full border px-3 py-2 text-[0.65rem] font-black uppercase ${wagerCurrency === "none" ? "border-[#90d587] text-[#dce9d9]" : "border-[#72c16a]/25 text-[#8bae87]"}`}>no wager</button>
            {[1, 2, 3, 4, 5].map((coins) => <button key={coins} onClick={() => { setWagerCurrency("coins"); setWagerAmount(coins); }} className={`rounded-full border px-3 py-2 text-[0.65rem] font-black uppercase ${wagerCurrency === "coins" && wagerAmount === coins ? "border-[#90d587] text-[#dce9d9]" : "border-[#72c16a]/25 text-[#8bae87]"}`}>{coins}c</button>)}
            <button onClick={() => { setWagerCurrency("token"); setWagerAmount(1); }} className={`rounded-full border px-3 py-2 text-[0.65rem] font-black uppercase ${wagerCurrency === "token" ? "border-[#90d587] text-[#dce9d9]" : "border-[#72c16a]/25 text-[#8bae87]"}`}>1 token</button>
          </div>
          <button disabled={pending || !selectedOption} onClick={sendVote} className="mt-3 w-full rounded-full border border-[#90d587]/60 bg-[#72c16a]/14 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#dce9d9] disabled:opacity-40">{pending ? "locking" : "lock vote"}</button>
        </div>
      ) : null}

      {!data.isSignedIn && isOpen ? <Link href="/login" className="mt-5 rounded-full border border-[#90d587]/50 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.18em] text-[#cce2c9] hover:bg-[#72c16a]/12">sign in to vote</Link> : null}

      <div className="mt-auto pt-5">
        <div className="flex items-end justify-between gap-3 text-[0.62rem] font-black uppercase tracking-[0.13em] text-[#789274]">
          <span>{poll.totalVotes} voters</span>
          <span>{poll.status === "settled" ? new Date(poll.closesAt).toLocaleDateString() : poll.status === "cancelled" ? "closed" : `closes ${closesIn}`}</span>
        </div>
        {hasVoted ? <p className="mt-3 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#a9cda5]">your vote is locked{poll.viewerWagerCurrency !== "none" ? ` · ${poll.viewerWagerAmount} ${poll.viewerWagerCurrency}` : ""}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {poll.canEdit && !editing ? <button onClick={() => setEditing(true)} className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-[#a9cda5] underline underline-offset-4">edit</button> : null}
          {poll.canCancel ? <button disabled={pending} onClick={() => updatePoll("cancel")} className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-[#c98c8c] underline underline-offset-4">cancel</button> : null}
        </div>
        {message ? <p className="mt-3 text-[0.65rem] font-black uppercase tracking-[0.13em] text-[#b8d9b4]">{message}</p> : null}
      </div>
    </article>
  );
}

export default function PollBoard({ initialCreate = false }: { initialCreate?: boolean }) {
  const [data, setData] = useState<PollResponse>(emptyResponse);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<PollFilter>("open");
  const [showComposer, setShowComposer] = useState(initialCreate);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    const response = await fetch("/api/polls", { cache: "no-store" });
    const result = (await response.json()) as PollResponse & { message?: string };
    if (!response.ok) {
      setMessage(result.message ?? "poll board unavailable");
      setLoading(false);
      return;
    }
    setData(result);
    setMessage("");
    setLoading(false);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void refresh());
    return () => window.cancelAnimationFrame(frame);
  }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const filteredPolls = useMemo(() => {
    return data.polls.filter((poll) => {
      if (filter === "open") return poll.status === "open" || poll.status === "staging";
      if (filter === "closing") return poll.status === "open" && new Date(poll.closesAt).getTime() - now <= 86_400_000;
      if (filter === "results") return poll.status === "settled" || poll.status === "cancelled";
      if (filter === "mine") return poll.authorMember === data.viewer?.member;
      return true;
    });
  }, [data.polls, data.viewer?.member, filter, now]);

  return (
    <div>
      <div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.32em] text-[#9abc96]">c:\bay-space\polls&gt; public-board</p>
          <h1 className="mt-4 text-5xl font-black uppercase tracking-[0.12em] text-[#72c16a] [text-shadow:0_0_24px_rgba(114,193,106,0.35)] sm:text-7xl">Polls</h1>
        </div>
      </div>

      {message ? <p className="mt-8 rounded-2xl border border-[#b67272]/35 bg-black/40 p-4 text-sm font-bold text-[#d2a3a3]">{message}</p> : null}
      {loading ? <p className="mt-10 text-sm font-black uppercase tracking-[0.2em] text-[#9abc96]">loading poll grid...</p> : filteredPolls.length ? (
        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredPolls.map((poll) => <PollCard key={poll.id} poll={poll} data={data} now={now} refresh={refresh} />)}
        </div>
      ) : (
        <div className="mt-8 rounded-[2rem] border border-dashed border-[#72c16a]/30 bg-black/30 p-10 text-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#9abc96]">No polls in this lane yet.</p>
        </div>
      )}

      <section aria-label="Poll counts and filters" className="mt-8 border-t border-[#72c16a]/25 pt-6">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[#72c16a]/35 bg-black/35 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-[#a9cda5]">{data.activeCount} live</span>
          <span className="rounded-full border border-[#72c16a]/35 bg-black/35 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-[#a9cda5]">{data.availableSlots} slots open</span>
          {data.viewer ? <span className="rounded-full border border-[#72c16a]/25 bg-black/35 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-[#8bae87]">{data.viewer.bayoCoins}c · {data.viewer.bayoTokens}t</span> : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {(["open", "closing", "results", ...(data.viewer ? ["mine" as const] : []), "all"] as PollFilter[]).map((item) => (
            <button key={item} onClick={() => setFilter(item)} className={`rounded-full border px-4 py-2 text-[0.68rem] font-black uppercase tracking-[0.16em] ${filter === item ? "border-[#90d587]/65 bg-[#72c16a]/18 text-[#dce9d9]" : "border-[#72c16a]/25 text-[#8bae87]"}`}>{item === "mine" ? "my polls" : item === "closing" ? "closing soon" : item}</button>
          ))}
        </div>
      </section>

      {data.canAuthor ? <button onClick={() => setShowComposer((visible) => !visible)} className="mt-6 rounded-full border border-[#90d587]/50 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#cce2c9] hover:bg-[#72c16a]/12">{showComposer ? "close author console" : "author a poll"}</button> : null}
      {data.canAuthor && showComposer ? <div className="mt-8"><PollComposer availableSlots={data.availableSlots} onCreated={refresh} /></div> : null}
    </div>
  );
}
