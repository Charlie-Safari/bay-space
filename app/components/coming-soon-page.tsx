import HomeBar from "./home-bar";

type ComingSoonPageProps = {
  label: string;
  command: string;
};

export default function ComingSoonPage({ label, command }: ComingSoonPageProps) {
  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\{command}&gt; open
        </p>
        <h1 className="text-5xl font-black uppercase tracking-[0.18em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-7xl">
          {label}
        </h1>
        <p className="mt-8 max-w-xl border-l-2 border-[#39ff14] pl-4 text-2xl font-bold uppercase tracking-[0.18em] text-[#d7ffd0]">
          coming soon
        </p>
      </section>
    </main>
  );
}
