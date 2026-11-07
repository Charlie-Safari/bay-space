"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CryptiCircle,
  CryptiCircleMember,
  createCryptiCircle,
  cryptiCircleStoreEvent,
  deleteCryptiCircle,
  getMutualCryptiPersonalCircleConnections,
  listCryptiCirclesForMember,
} from "./crypti-circle-store";

type CryptiCirclesPanelProps = {
  favoriteTickerSymbols: string[];
  member: CryptiCircleMember;
};

const cryptiCircleLogoOptions = ["◎", "◆", "✦", "☀", "☾", "★", "✓", "💎", "🎟️"];

export default function CryptiCirclesPanel({
  favoriteTickerSymbols,
  member,
}: CryptiCirclesPanelProps) {
  const [circles, setCircles] = useState<CryptiCircle[]>([]);
  const [mutualConnections, setMutualConnections] = useState<
    CryptiCircleMember[]
  >([]);
  const [selectedCircleId, setSelectedCircleId] = useState("");
  const [isCreateCircleOpen, setIsCreateCircleOpen] = useState(false);
  const [circleName, setCircleName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [affiliatedTickers, setAffiliatedTickers] = useState<string[]>([]);
  const [circleLogo, setCircleLogo] = useState(cryptiCircleLogoOptions[0]);

  const loadCircles = useCallback(async () => {
    const nextCircles = listCryptiCirclesForMember(member.member);
    const nextConnections = getMutualCryptiPersonalCircleConnections(
      member.member,
    );

    await Promise.resolve();

    return {
      circles: nextCircles,
      mutualConnections: nextConnections,
    };
  }, [member.member]);

  useEffect(() => {
    let isMounted = true;

    async function syncCircles() {
      const nextState = await loadCircles();

      if (!isMounted) {
        return;
      }

      setCircles(nextState.circles);
      setMutualConnections(nextState.mutualConnections);
    }

    syncCircles();
    window.addEventListener("storage", syncCircles);
    window.addEventListener(cryptiCircleStoreEvent, syncCircles);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncCircles);
      window.removeEventListener(cryptiCircleStoreEvent, syncCircles);
    };
  }, [loadCircles]);

  function submitCircle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const circle = createCryptiCircle({
      affiliatedTickers,
      circleLogo,
      groupDescription,
      name: circleName,
      owner: member,
    });

    if (!circle) {
      return;
    }

    setCircleName("");
    setGroupDescription("");
    setAffiliatedTickers([]);
    setCircleLogo(cryptiCircleLogoOptions[0]);
    setIsCreateCircleOpen(false);
  }

  function toggleAffiliatedTicker(symbol: string) {
    setAffiliatedTickers((tickerSymbols) =>
      tickerSymbols.includes(symbol)
        ? tickerSymbols.filter((tickerSymbol) => tickerSymbol !== symbol)
        : [...tickerSymbols, symbol],
    );
  }

  function deleteMemberCircle(circleId: string) {
    deleteCryptiCircle(circleId, member.member);
    setSelectedCircleId("");
  }

  const selectedCircle =
    selectedCircleId === "my-crypti-circle"
      ? null
      : circles.find((circle) => circle.id === selectedCircleId) ?? null;
  const createdCircles = circles.filter(
    (circle) => circle.ownerMember === member.member,
  );
  const joinedCircles = circles.filter(
    (circle) => circle.ownerMember !== member.member,
  );

  if (selectedCircleId === "my-crypti-circle") {
    return (
      <section className="grid gap-5 border-2 border-[#355a76] bg-black px-5 py-6 shadow-[0_0_20px_rgba(121,206,255,0.14)]">
        <button
          type="button"
          onClick={() => setSelectedCircleId("")}
          className="w-fit border border-[#355a76] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#79ceff] transition hover:border-[#79ceff] hover:bg-[#79ceff] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#deeffd]"
        >
          back
        </button>
        <div className="border-2 border-[#79ceff] bg-[#0a1829] px-4 py-4 shadow-[0_0_18px_rgba(121,206,255,0.16)]">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#deeffd]">
            MY +CRYPTI CIRCLE
          </p>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#a0b9d1]">
            Personal Circle
          </p>
          <div className="mt-5 grid gap-2">
            {mutualConnections.length ? (
              mutualConnections.map((connection) => (
                <Link
                  key={connection.member}
                  href={`/crypti?profile=${encodeURIComponent(connection.member)}`}
                  className="border border-[#355a76] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#79ceff] transition hover:border-[#79ceff] hover:bg-[#79ceff] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#deeffd]"
                >
                  {connection.name}
                </Link>
              ))
            ) : (
              <p className="border-l-2 border-[#79ceff] pl-3 text-sm font-bold uppercase tracking-[0.14em] text-[#deeffd]">
                empty
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (selectedCircle) {
    const isFounder = selectedCircle.ownerMember === member.member;

    return (
      <section className="grid gap-5 border-2 border-[#355a76] bg-black px-5 py-6 shadow-[0_0_20px_rgba(121,206,255,0.14)]">
        <button
          type="button"
          onClick={() => setSelectedCircleId("")}
          className="w-fit border border-[#355a76] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#79ceff] transition hover:border-[#79ceff] hover:bg-[#79ceff] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#deeffd]"
        >
          back
        </button>
        <div className="border-2 border-[#79ceff] bg-black p-4 shadow-[0_0_18px_rgba(121,206,255,0.22)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#79ceff]">
                {selectedCircle.circleLogo || cryptiCircleLogoOptions[0]}{" "}
                {selectedCircle.name}
                {isFounder ? " (FOUNDER)" : ""}
              </p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#a0b9d1]">
                +CRYPTI CIRCLE
              </p>
            </div>
            {isFounder ? (
              <button
                type="button"
                onClick={() => deleteMemberCircle(selectedCircle.id)}
                className="grid h-7 w-7 shrink-0 place-items-center border border-[#ff3b3b] text-xs font-black text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
                aria-label={`Delete ${selectedCircle.name}`}
                title="Delete +circle"
              >
                x
              </button>
            ) : null}
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#a0b9d1]">
            group description
          </p>
          <p className="mt-3 border border-[#355a76] px-3 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#deeffd]">
            {selectedCircle.groupDescription || "empty"}
          </p>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#a0b9d1]">
            affiliated tickers
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedCircle.affiliatedTickers.length ? (
              selectedCircle.affiliatedTickers.map((symbol) => (
                <span
                  key={symbol}
                  className="border border-[#355a76] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#79ceff]"
                >
                  {symbol}
                </span>
              ))
            ) : (
              <p className="border-l-2 border-[#79ceff] pl-3 text-sm font-bold uppercase tracking-[0.14em] text-[#deeffd]">
                empty
              </p>
            )}
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#a0b9d1]">
            members
          </p>
          <div className="mt-3 grid gap-2">
            {selectedCircle.members.map((circleMember) => (
              <Link
                key={circleMember.member}
                href={`/crypti?profile=${encodeURIComponent(circleMember.member)}`}
                className="border border-[#355a76] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#79ceff] transition hover:border-[#79ceff] hover:bg-[#79ceff] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#deeffd]"
              >
                {circleMember.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-5 border-2 border-[#355a76] bg-black px-5 py-6 shadow-[0_0_20px_rgba(121,206,255,0.14)]">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#deeffd]">
          +CIRCLES
        </p>
        <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.14em] text-[#79ceff] [text-shadow:0_0_14px_rgba(121,206,255,0.7)]">
          +Crypti circle board
        </h2>
      </div>

      <div className="border-2 border-[#79ceff] bg-[#0a1829] px-3 py-3 shadow-[0_0_18px_rgba(121,206,255,0.16)]">
        <button
          type="button"
          onClick={() => setSelectedCircleId("my-crypti-circle")}
          className="block w-full text-left text-sm font-black uppercase tracking-[0.18em] text-[#deeffd] transition hover:text-[#79ceff] focus:outline-none focus:ring-2 focus:ring-[#deeffd]"
        >
          MY +CRYPTI CIRCLE
        </button>
        <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#a0b9d1]">
          Personal Circle
        </p>
        <div className="mt-4 grid gap-2">
          {mutualConnections.length ? (
            mutualConnections.map((connection) => (
              <Link
                key={connection.member}
                href={`/crypti?profile=${encodeURIComponent(connection.member)}`}
                className="border border-[#355a76] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#79ceff] transition hover:border-[#79ceff] hover:bg-[#79ceff] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#deeffd]"
              >
                {connection.name}
              </Link>
            ))
          ) : (
            <p className="border-l-2 border-[#79ceff] pl-3 text-sm font-bold uppercase tracking-[0.14em] text-[#deeffd]">
              empty
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-[#355a76] bg-[#0a1829] p-4">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[#79ceff]">
            Created +Crypti Circles
          </h3>
          <div className="mt-4 grid gap-3">
            {createdCircles.length ? (
              createdCircles.map((circle) => (
                <div key={circle.id} className="border border-[#355a76] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedCircleId(circle.id)}
                      className="block min-w-0 text-left text-sm font-black uppercase tracking-[0.14em] text-[#deeffd] transition hover:text-[#79ceff] focus:outline-none focus:ring-2 focus:ring-[#deeffd]"
                    >
                      {circle.circleLogo || cryptiCircleLogoOptions[0]}{" "}
                      {circle.name} (FOUNDER)
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMemberCircle(circle.id)}
                      className="grid h-7 w-7 shrink-0 place-items-center border border-[#ff3b3b] text-xs font-black text-[#ff6b6b] transition hover:bg-[#ff3b3b] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#ff9b9b]"
                      aria-label={`Delete ${circle.name}`}
                      title="Delete +circle"
                    >
                      x
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="border-l-2 border-[#79ceff] pl-3 text-sm font-bold uppercase tracking-[0.14em] text-[#deeffd]">
                empty
              </p>
            )}
          </div>
        </section>

        <section className="border border-[#355a76] bg-[#0a1829] p-4">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[#79ceff]">
            Joined +Crypti Circles
          </h3>
          <div className="mt-4 grid gap-3">
            {joinedCircles.length ? (
              joinedCircles.map((circle) => (
                <button
                  key={circle.id}
                  type="button"
                  onClick={() => setSelectedCircleId(circle.id)}
                  className="border border-[#355a76] px-3 py-3 text-left text-sm font-black uppercase tracking-[0.14em] text-[#deeffd] transition hover:border-[#79ceff] hover:text-[#79ceff] focus:outline-none focus:ring-2 focus:ring-[#deeffd]"
                >
                  {circle.circleLogo || cryptiCircleLogoOptions[0]}{" "}
                  {circle.name}
                </button>
              ))
            ) : (
              <p className="border-l-2 border-[#79ceff] pl-3 text-sm font-bold uppercase tracking-[0.14em] text-[#deeffd]">
                empty
              </p>
            )}
          </div>
        </section>
      </div>

      <button
        type="button"
        onClick={() => setIsCreateCircleOpen((isOpen) => !isOpen)}
        className="w-fit border-2 border-[#79ceff] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#79ceff] transition hover:bg-[#79ceff] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#deeffd]"
      >
        create new +circle
      </button>

      {isCreateCircleOpen ? (
        <form
          onSubmit={submitCircle}
          className="border-2 border-[#79ceff] bg-black p-4 shadow-[0_0_18px_rgba(121,206,255,0.22)]"
        >
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#deeffd]">
            create new +circle
          </p>
          <div className="mt-5 grid max-w-xl gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[#a0b9d1]">
                Circle name
              </span>
              <input
                type="text"
                value={circleName}
                onChange={(event) =>
                  setCircleName(event.target.value.slice(0, 64))
                }
                className="border border-[#355a76] bg-[#0a1829] px-3 py-2 text-sm font-black tracking-[0.12em] text-[#79ceff] outline-none focus:ring-2 focus:ring-[#79ceff]"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[#a0b9d1]">
                Group description
              </span>
              <textarea
                maxLength={150}
                value={groupDescription}
                onChange={(event) =>
                  setGroupDescription(event.target.value.slice(0, 150))
                }
                className="min-h-24 resize-y border border-[#355a76] bg-[#0a1829] px-3 py-2 text-sm font-black tracking-[0.08em] text-[#79ceff] outline-none focus:ring-2 focus:ring-[#79ceff]"
              />
              <span className="text-right text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#a0b9d1]">
                {groupDescription.length}/150
              </span>
            </label>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a0b9d1]">
                Affiliated tickers
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {favoriteTickerSymbols.length ? (
                  favoriteTickerSymbols.map((symbol) => (
                    <button
                      key={symbol}
                      type="button"
                      onClick={() => toggleAffiliatedTicker(symbol)}
                      className={`border px-3 py-2 text-xs font-black uppercase tracking-[0.16em] transition focus:outline-none focus:ring-2 focus:ring-[#deeffd] ${
                        affiliatedTickers.includes(symbol)
                          ? "border-[#79ceff] bg-[#79ceff] text-black"
                          : "border-[#355a76] text-[#79ceff] hover:border-[#79ceff]"
                      }`}
                    >
                      {symbol}
                    </button>
                  ))
                ) : (
                  <p className="border-l-2 border-[#79ceff] pl-3 text-sm font-bold uppercase tracking-[0.14em] text-[#deeffd]">
                    no favorite tickers
                  </p>
                )}
              </div>
            </div>
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[#a0b9d1]">
                Circle logo
              </span>
              <select
                value={circleLogo}
                onChange={(event) => setCircleLogo(event.target.value)}
                className="w-fit border border-[#355a76] bg-[#0a1829] px-3 py-2 text-xl font-black text-[#79ceff] outline-none focus:ring-2 focus:ring-[#79ceff]"
              >
                {cryptiCircleLogoOptions.map((logo) => (
                  <option key={logo} value={logo}>
                    {logo}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={!circleName.trim()}
              className="w-fit border-2 border-[#79ceff] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#79ceff] transition hover:bg-[#79ceff] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#deeffd] disabled:border-[#355a76] disabled:text-[#355a76] disabled:hover:bg-black"
            >
              submit
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
