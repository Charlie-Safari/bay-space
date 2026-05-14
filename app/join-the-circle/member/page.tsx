import HomeBar from "../../components/home-bar";
import RoleSelector from "./role-selector";

type CircleMemberProps = {
  searchParams: Promise<{
    member?: string;
    name?: string;
  }>;
};

export default async function CircleMember({ searchParams }: CircleMemberProps) {
  const { member = "33334", name = "explorer" } = await searchParams;

  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\circle\member&gt; active
        </p>
        <h1 className="text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          Member: {member} - {name}
        </h1>
        <p className="mt-8 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-base leading-7 text-[#d7ffd0] sm:text-lg">
          Welcome, explorer.
        </p>

        <RoleSelector member={member} name={name} />
      </section>
    </main>
  );
}
