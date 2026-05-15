"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen bg-[#020402] px-4 py-16 font-mono text-[#39ff14]">
          <section className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-6xl flex-col justify-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#d7ffd0]">
              emergency broadcast
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase tracking-[0.18em] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
              bay-space offline
            </h1>
            <p className="mt-6 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-base leading-7 text-[#d7ffd0]">
              the shell failed before the channel could render.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-10 w-fit border-2 border-[#39ff14] bg-black px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
            >
              reboot
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
