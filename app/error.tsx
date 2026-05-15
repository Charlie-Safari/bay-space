"use client";

import Link from "next/link";
import HomeBar from "./components/home-bar";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />
      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
          transmission interrupted
        </p>
        <h1 className="mt-4 text-4xl font-black uppercase tracking-[0.18em] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          system fault
        </h1>
        <p className="mt-6 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-base leading-7 text-[#d7ffd0]">
          something broke while loading this channel.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="border-2 border-[#39ff14] bg-black px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            retry
          </button>
          <Link
            href="/"
            className="border-2 border-[#39ff14] bg-black px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            return home
          </Link>
        </div>
      </section>
    </main>
  );
}
