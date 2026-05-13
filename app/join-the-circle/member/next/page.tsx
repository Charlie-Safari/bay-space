import Link from "next/link";
import HomeBar from "../../../components/home-bar";

type CircleNextProps = {
  searchParams: Promise<{
    member?: string;
    name?: string;
    roles?: string;
  }>;
};

const ghostRoles = ["ghost author - news", "ghost author - conspiracy"];
const creatorRoles = [
  "creator/ influencer - news",
  "creator/ influencer - conspiracy",
];

function getAccountTitle(selectedRoles: string[]) {
  if (selectedRoles.some((role) => creatorRoles.includes(role))) {
    return "Creator / Influencer";
  }

  if (selectedRoles.some((role) => ghostRoles.includes(role))) {
    return "Ghost Author";
  }

  return "Curious Reader";
}

export default async function CircleNext({ searchParams }: CircleNextProps) {
  const { member = "001", name = "explorer", roles = "" } = await searchParams;
  const selectedRoles = roles.split(",").filter(Boolean);
  const accountTitle = getAccountTitle(selectedRoles);
  const encodedNext = `/join-the-circle/member/pin?name=${encodeURIComponent(
    name,
  )}&member=${member}&roles=${encodeURIComponent(
    selectedRoles.join(","),
  )}&title=${encodeURIComponent(accountTitle)}`;
  const encodedBack = `/join-the-circle/member?name=${encodeURIComponent(
    name,
  )}&member=${member}`;
  const hasGhostRole = selectedRoles.some((role) => ghostRoles.includes(role));
  const hasCreatorRole = selectedRoles.some((role) =>
    creatorRoles.includes(role),
  );

  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <section className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\circle\next&gt; prescreen
        </p>
        <h1 className="text-4xl font-black uppercase tracking-[0.16em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-6xl">
          Member: {member} - {name}
        </h1>
        <p className="mt-8 max-w-2xl border-l-2 border-[#39ff14] pl-4 text-base leading-7 text-[#d7ffd0] sm:text-lg">
          prescreening message.
        </p>

        <div className="mt-10 w-full max-w-2xl border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.18)]">
          <h2 className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
            selected signals
          </h2>
          <div className="mt-4 grid gap-3">
            {selectedRoles.length > 0 ? (
              selectedRoles.map((role) => (
                <p
                  key={role}
                  className="border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#d7ffd0]"
                >
                  {role}
                </p>
              ))
            ) : (
              <p className="border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#d7ffd0]">
                no signals selected
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 w-full max-w-2xl border border-[#1d7f12] bg-[#001100] p-4 text-sm font-bold leading-7 text-[#d7ffd0]">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#39ff14]">
            prescreen
          </p>
          {hasGhostRole ? (
            <p className="mt-3">
              Access to posts on daily food, theories, library. Please maintain
              accuracy, and include sources/references.
            </p>
          ) : null}
          {hasCreatorRole ? (
            <>
              <p className="mt-3">
                proceding with these will require a creator code - to obtaion a
                creator code please email bayoracle@protonmail.com
              </p>
              <p className="mt-3">
                Access to posts on Top Story, daily food, theories, library.
                your contributions may be flagged for removal
              </p>
            </>
          ) : null}
          {!hasGhostRole && !hasCreatorRole ? (
            <p className="mt-3">
              Access to reading anything on bay-space ; no access to posting
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex gap-3">
          <Link
            href={encodedBack}
            className="border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            back
          </Link>
          <Link
            href={encodedNext}
            className="border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            next
          </Link>
        </div>
      </section>
    </main>
  );
}
