export default function ArticleReadLight({ read }: { read: boolean }) {
  return (
    <p className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#b6ccb2]">
      <span
        aria-hidden="true"
        className={read ? "text-[#88ec73] [text-shadow:0_0_8px_#39ff14]" : "text-[#6f886b]"}
      >
        (*)
      </span>
      <span>{read ? "Read" : "Not yet recorded"}</span>
    </p>
  );
}
