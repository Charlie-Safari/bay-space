import styles from "./profile.module.css";

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
    <section className="rounded-xl border border-[#365d36] bg-[#09150c] p-4">
      <h3 className="text-xs font-black uppercase tracking-[0.18em] text-[#9abc96]">
        {title}
      </h3>
      {items.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-xl border border-[#72c16a] bg-black px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#dce9d9]"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-4 border-l-2 border-[#72c16a] pl-3 text-xs font-bold uppercase tracking-[0.14em] text-[#9abc96]">
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
    <details className={`${styles.disclosure} mt-6`}>
      <summary className={styles.summary}>
        <span>Trophy Case</span>
        <span
          aria-hidden="true"
          className="text-lg leading-none text-[#72c16a]"
        >
          ▾
        </span>
      </summary>
      <div className="grid gap-4 border-t border-[#365d36] p-4 lg:grid-cols-3">
        <TrophyGroup title="Badges" items={badges} />
        <TrophyGroup title="Cards" items={cards} />
        <TrophyGroup title="Stamps" items={stamps} />
      </div>
    </details>
  );
}
