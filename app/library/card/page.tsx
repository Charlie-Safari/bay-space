import Link from "next/link";
import { listLibraryCardActivity } from "../../../lib/bay-space-db";
import { getCurrentMember } from "../../../lib/bay-space-session";

const views = [
  { id: "articles", label: "Articles" },
  { id: "comments", label: "Comments" },
] as const;

const sections = [
  { id: "conspiracy", title: "Conspiracy" },
  { id: "current-events", title: "Current Events" },
] as const;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Los_Angeles",
});

function articleHref(category: string, postId: string) {
  if (category === "theory") return `/theories#post-${postId}`;
  if (category === "top-story") return `/news/post?id=${postId}`;
  return `/facts-on-news#post-${postId}`;
}

export default async function LibraryCardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const [{ view }, member] = await Promise.all([
    searchParams,
    getCurrentMember({ includeParticipation: false }),
  ]);
  const selected = views.find(({ id }) => id === view);
  const activity = member && selected
    ? await listLibraryCardActivity(member.member, selected.id)
    : [];

  return (
    <main className="min-h-screen bg-[#030604] px-4 py-10 font-mono text-[#d8ecd2] sm:py-16">
      <div className="mx-auto grid max-w-4xl gap-6">
        <Link href="/library" className="w-fit text-sm text-[#a2d59b] underline underline-offset-4">
          ← Library
        </Link>
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-[#a2d59b]">Bay Space Library</p>
          <h1 className="mt-2 text-3xl font-black uppercase sm:text-5xl">Library Card</h1>
        </header>
        <nav aria-label="Library Card history" className="grid grid-cols-2 gap-3">
          {views.map(({ id, label }) => (
            <Link
              key={id}
              href={`/library/card?view=${id}`}
              aria-current={selected?.id === id ? "page" : undefined}
              className="rounded-xl border border-[#426840] bg-[#0b170b] px-3 py-4 text-center text-sm font-bold uppercase tracking-wider hover:bg-[#152b15] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a2d59b] aria-[current=page]:border-[#a2d59b] aria-[current=page]:bg-[#173217]"
            >
              {label}
            </Link>
          ))}
        </nav>

        {!member ? (
          <p className="rounded-xl border border-[#426840] bg-[#0b170b] p-5">
            <Link href="/" className="text-[#a2d59b] underline underline-offset-4">Sign in</Link>
            {" "}to see your reading and comment history.
          </p>
        ) : !selected ? (
          <p className="text-sm text-[#b6ccb2]">Choose Articles to see what you’ve read, or Comments to see what you’ve written.</p>
        ) : (
          sections.map(({ id, title }) => {
            const entries = activity.filter(({ category }) =>
              id === "conspiracy" ? category === "theory" : category !== "theory",
            );

            return (
              <section key={id} aria-labelledby={id} className="min-w-0 rounded-xl border border-[#426840] bg-[#0b170b] p-5 sm:p-6">
                <h2 id={id} className="text-lg font-bold text-[#a2d59b]">{title}</h2>
                {entries.length ? (
                  <ul className="mt-2 divide-y divide-[#426840]">
                    {entries.map((entry) => (
                      <li key={entry.id} className="grid gap-2 py-4 [overflow-wrap:anywhere]">
                        <Link href={articleHref(entry.category, entry.postId)} className="w-fit font-bold underline-offset-4 hover:underline">
                          {entry.title}
                        </Link>
                        <time dateTime={entry.date} className="text-xs text-[#b6ccb2]">
                          {dateFormat.format(new Date(entry.date))} PT
                        </time>
                        {entry.body !== undefined && <p className="whitespace-pre-wrap text-sm leading-relaxed">{entry.body}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-[#b6ccb2]">
                    {selected.id === "articles" ? "No articles read yet." : "No comments yet."}
                  </p>
                )}
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}
