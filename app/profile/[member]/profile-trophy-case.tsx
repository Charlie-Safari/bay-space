type ProfileTrophyCaseProps = {
  badges: string[];
  cards: string[];
  stamps: string[];
};

type TrophyGroupProps = {
  items: string[];
  title: string;
};

function TrophyGroup({ items, title }: TrophyGroupProps) {
  return (
    <section className="border border-[#1d7f12] bg-[#001100] p-4">
      <h3 className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
        {title}
      </h3>
      {items.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="border border-[#39ff14] bg-black px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#d7ffd0]"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-4 border-l-2 border-[#39ff14] pl-3 text-xs font-bold uppercase tracking-[0.14em] text-[#7f9f78]">
          empty
        </p>
      )}
    </section>
  );
}

export default function ProfileTrophyCase({
  badges,
  cards,
  stamps,
}: ProfileTrophyCaseProps) {
  return (
    <details className="mt-8 w-full border-2 border-[#39ff14] bg-black shadow-[0_0_18px_rgba(57,255,20,0.18)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0] transition hover:bg-[#001100] hover:text-[#39ff14] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#d7ffd0] [&::-webkit-details-marker]:hidden">
        <span>Trophy Case</span>
        <span
          aria-hidden="true"
          className="text-lg leading-none text-[#39ff14]"
        >
          ▾
        </span>
      </summary>
      <div className="grid gap-4 border-t border-[#1d7f12] p-4 lg:grid-cols-3">
        <TrophyGroup title="Badges" items={badges} />
        <TrophyGroup title="Cards" items={cards} />
        <TrophyGroup title="Stamps" items={stamps} />
      </div>
    </details>
  );
}
