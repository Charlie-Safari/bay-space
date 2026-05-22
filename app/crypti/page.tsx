import HomeBar from "../components/home-bar";
import CryptiTerminal from "./crypti-terminal";
import { getCurrentMember } from "../../lib/bay-space-session";
import { isCrypti } from "../../lib/bay-space-roles";

export default async function Crypti() {
  const member = await getCurrentMember();
  const hasCryptiAccess = Boolean(member && isCrypti(member.roles));

  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\crypti&gt; signal-room
        </p>
        <h1 className="text-5xl font-black uppercase tracking-[0.18em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-7xl">
          crypti
        </h1>

        {hasCryptiAccess ? (
          <CryptiTerminal />
        ) : (
          <div className="mt-10 max-w-2xl border-2 border-[#1d7f12] bg-black p-5 shadow-[0_0_18px_rgba(57,255,20,0.16)]">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
              crypti account required
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
