import HomeBar from "../../components/home-bar";
import {
  defaultMemberRole,
  defaultMemberTitle,
} from "../../../lib/bay-space-roles";
import PasswordConfirmForm from "./confirm/password-confirm-form";

type CircleMemberProps = {
  searchParams: Promise<{
    member?: string;
    name?: string;
    ref?: string;
  }>;
};

export default async function CircleMember({ searchParams }: CircleMemberProps) {
  const { member = "33332", name = "explorer", ref = name } = await searchParams;

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
          Welcome, explorer. Create your password and enter as Reader.
        </p>

        <div className="mt-10 w-full max-w-2xl border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
            Rank: {defaultMemberTitle}
          </p>
          <p className="mt-3 text-xs font-black uppercase leading-6 tracking-[0.18em] text-[#7f9f78]">
            Reader can read theories and news. Promotions unlock Library,
            posting, Graduation, and the Bayo Coin exchange.
          </p>
          <PasswordConfirmForm
            member={member}
            name={name}
            refName={ref}
            roles={defaultMemberRole}
            title={defaultMemberTitle}
          />
        </div>
      </section>
    </main>
  );
}
