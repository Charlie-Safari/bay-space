import TerminalLoadingShell from "./components/terminal-loading-shell";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#020402] px-4 py-14 font-mono text-[#39ff14]">
      <section className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-6xl flex-col justify-center">
        <TerminalLoadingShell />
      </section>
    </main>
  );
}
